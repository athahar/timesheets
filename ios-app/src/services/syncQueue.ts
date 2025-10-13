// Synchronization Queue for TrackPay
// Manages offline operations and ensures data consistency between AsyncStorage and Supabase

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, testConnection, safeQuery } from './supabase';
import { Client, Session, Payment, ActivityItem } from '../types';
import { DatabaseUser, DatabaseSession, DatabasePayment, DatabaseActivity } from './database.interface';
import { storageAdapter } from './storageAdapter';

// Queue operation types
export interface QueueOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'client' | 'session' | 'payment' | 'activity';
  data: any;
  localData?: any; // For keeping local references
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: string | null;
  pendingOperations: number;
  failedOperations: number;
  lastError: string | null;
}

export class SyncQueue {
  private static instance: SyncQueue;
  private queue: QueueOperation[] = [];
  private isProcessing = false;
  private syncStatusListeners: Array<(status: SyncStatus) => void> = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly QUEUE_STORAGE_KEY = 'trackpay_sync_queue';
  private readonly SYNC_STATUS_KEY = 'trackpay_sync_status';
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly SYNC_INTERVAL_MS = 15000; // 15 seconds

  private constructor() {
    this.loadQueue();
    this.startPeriodicSync();
  }

  static getInstance(): SyncQueue {
    if (!SyncQueue.instance) {
      SyncQueue.instance = new SyncQueue();
    }
    return SyncQueue.instance;
  }

  // Queue management
  async addOperation(operation: Omit<QueueOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queueOp: QueueOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: operation.maxRetries || this.DEFAULT_MAX_RETRIES,
      status: 'pending',
    };

    this.queue.push(queueOp);
    await this.saveQueue();

    if (__DEV__) {

      if (__DEV__) { if (__DEV__) console.log(`📤 SyncQueue: Added ${operation.type} ${operation.entity} operation:`, id); }

    }
    this.notifyStatusListeners();

    // Try to process immediately if online
    if (await testConnection()) {
      this.processQueue();
    }

    return id;
  }

  async removeOperation(id: string): Promise<void> {
    this.queue = this.queue.filter(op => op.id !== id);
    await this.saveQueue();
    this.notifyStatusListeners();
  }

  async getStatus(): Promise<SyncStatus> {
    const isOnline = await testConnection();
    const pendingOps = this.queue.filter(op => op.status === 'pending' || op.status === 'processing');
    const failedOps = this.queue.filter(op => op.status === 'failed');

    const savedStatus = await AsyncStorage.getItem(this.SYNC_STATUS_KEY);
    const lastSync = savedStatus ? JSON.parse(savedStatus).lastSync : null;

    return {
      isOnline,
      isSyncing: this.isProcessing,
      lastSync,
      pendingOperations: pendingOps.length,
      failedOperations: failedOps.length,
      lastError: failedOps.length > 0 ? failedOps[failedOps.length - 1].lastError || null : null,
    };
  }

  // Queue processing
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      if (__DEV__) { if (__DEV__) console.log('🔄 SyncQueue: Already processing, skipping'); }
      return;
    }

    const isOnline = await testConnection();
    if (!isOnline) {
      if (__DEV__) { if (__DEV__) console.log('📴 SyncQueue: Offline, delaying sync'); }
      return;
    }

    this.isProcessing = true;
    this.notifyStatusListeners();

    if (__DEV__) {

      if (__DEV__) { if (__DEV__) console.log(`🔄 SyncQueue: Processing ${this.queue.length} operations`); }

    }

    const pendingOps = this.queue.filter(op => op.status === 'pending');

    for (const operation of pendingOps) {
      try {
        await this.processOperation(operation);
      } catch (error) {
        console.error(`❌ SyncQueue: Failed to process operation ${operation.id}:`, error);
      }
    }

    this.isProcessing = false;
    await this.updateSyncStatus();
    this.notifyStatusListeners();

    if (__DEV__) {

      if (__DEV__) { if (__DEV__) console.log('✅ SyncQueue: Processing completed'); }

    }
  }

  private async processOperation(operation: QueueOperation): Promise<void> {
    operation.status = 'processing';
    await this.saveQueue();

    try {
      if (__DEV__) {
        if (__DEV__) { if (__DEV__) console.log(`🔄 SyncQueue: Processing ${operation.type} ${operation.entity}:`, operation.id); }
      }

      switch (operation.entity) {
        case 'client':
          await this.processClientOperation(operation);
          break;
        case 'session':
          await this.processSessionOperation(operation);
          break;
        case 'payment':
          await this.processPaymentOperation(operation);
          break;
        case 'activity':
          await this.processActivityOperation(operation);
          break;
        default:
          throw new Error(`Unknown entity type: ${operation.entity}`);
      }

      operation.status = 'completed';
      if (__DEV__) {
        if (__DEV__) { if (__DEV__) console.log(`✅ SyncQueue: Completed ${operation.type} ${operation.entity}:`, operation.id); }
      }

      // Remove completed operations after a delay
      setTimeout(() => {
        this.removeOperation(operation.id);
      }, 5000);

    } catch (error) {
      operation.retryCount++;
      operation.lastError = error instanceof Error ? error.message : 'Unknown error';

      if (operation.retryCount >= operation.maxRetries) {
        operation.status = 'failed';
        console.error(`❌ SyncQueue: Operation failed permanently:`, operation.id, error);
      } else {
        operation.status = 'pending';
        if (__DEV__) {
          if (__DEV__) { if (__DEV__) console.warn(`⚠️ SyncQueue: Operation failed, retry ${operation.retryCount}/${operation.maxRetries}:`, operation.id, error); }
        }
      }
    }

    await this.saveQueue();
  }

  // Entity-specific processing
  private async processClientOperation(operation: QueueOperation): Promise<void> {
    const clientData = operation.data as Client;

    switch (operation.type) {
      case 'create':
        const userToCreate = storageAdapter.convertClientToUser(clientData);
        const { data, error } = await safeQuery(
          supabase.from('trackpay_users').insert([{
            id: userToCreate.id,
            name: userToCreate.name,
            role: userToCreate.role,
            hourly_rate: userToCreate.hourly_rate,
          }]).select().single()
        );
        if (error) throw new Error(error);
        break;

      case 'update':
        const userToUpdate = storageAdapter.convertClientToUser(clientData);
        const { error: updateError } = await safeQuery(
          supabase.from('trackpay_users')
            .update({
              name: userToUpdate.name,
              hourly_rate: userToUpdate.hourly_rate,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userToUpdate.id)
        );
        if (updateError) throw new Error(updateError);
        break;

      case 'delete':
        const { error: deleteError } = await safeQuery(
          supabase.from('trackpay_users').delete().eq('id', clientData.id)
        );
        if (deleteError) throw new Error(deleteError);
        break;
    }
  }

  private async processSessionOperation(operation: QueueOperation): Promise<void> {
    const sessionData = operation.data as Session;

    switch (operation.type) {
      case 'create':
        const dbSession = storageAdapter.convertSessionToDatabase(sessionData);
        const { error } = await safeQuery(
          supabase.from('trackpay_sessions').insert([{
            id: dbSession.id,
            provider_id: dbSession.provider_id,
            client_id: dbSession.client_id,
            start_time: dbSession.start_time,
            end_time: dbSession.end_time,
            duration_minutes: dbSession.duration_minutes,
            hourly_rate: dbSession.hourly_rate,
            amount_due: dbSession.amount_due,
            status: dbSession.status,
          }])
        );
        if (error) throw new Error(error);
        break;

      case 'update':
        const updatedDbSession = storageAdapter.convertSessionToDatabase(sessionData);
        const { error: updateError } = await safeQuery(
          supabase.from('trackpay_sessions')
            .update({
              end_time: updatedDbSession.end_time,
              duration_minutes: updatedDbSession.duration_minutes,
              amount_due: updatedDbSession.amount_due,
              status: updatedDbSession.status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', updatedDbSession.id)
        );
        if (updateError) throw new Error(updateError);
        break;

      case 'delete':
        const { error: deleteError } = await safeQuery(
          supabase.from('trackpay_sessions').delete().eq('id', sessionData.id)
        );
        if (deleteError) throw new Error(deleteError);
        break;
    }
  }

  private async processPaymentOperation(operation: QueueOperation): Promise<void> {
    const paymentData = operation.data as Payment & { sessionId: string; providerId: string };

    switch (operation.type) {
      case 'create':
        const { error } = await safeQuery(
          supabase.from('trackpay_payments').insert([{
            id: paymentData.id,
            session_id: paymentData.sessionId,
            provider_id: paymentData.providerId,
            client_id: paymentData.clientId,
            amount: paymentData.amount,
            method: paymentData.method,
            created_at: new Date(paymentData.paidAt).toISOString(),
          }])
        );
        if (error) throw new Error(error);
        break;

      case 'update':
        const { error: updateError } = await safeQuery(
          supabase.from('trackpay_payments')
            .update({
              amount: paymentData.amount,
              method: paymentData.method,
            })
            .eq('id', paymentData.id)
        );
        if (updateError) throw new Error(updateError);
        break;

      case 'delete':
        const { error: deleteError } = await safeQuery(
          supabase.from('trackpay_payments').delete().eq('id', paymentData.id)
        );
        if (deleteError) throw new Error(deleteError);
        break;
    }
  }

  private async processActivityOperation(operation: QueueOperation): Promise<void> {
    const activityData = operation.data as ActivityItem;

    switch (operation.type) {
      case 'create':
        const dbActivity = storageAdapter.convertActivityToDatabase(activityData);
        const { error } = await safeQuery(
          supabase.from('trackpay_activities').insert([{
            id: dbActivity.id,
            type: dbActivity.type,
            provider_id: dbActivity.provider_id,
            client_id: dbActivity.client_id,
            session_id: dbActivity.session_id,
            data: dbActivity.data,
            created_at: dbActivity.created_at,
          }])
        );
        if (error) throw new Error(error);
        break;

      case 'update':
        const updatedDbActivity = storageAdapter.convertActivityToDatabase(activityData);
        const { error: updateError } = await safeQuery(
          supabase.from('trackpay_activities')
            .update({
              data: updatedDbActivity.data,
            })
            .eq('id', updatedDbActivity.id)
        );
        if (updateError) throw new Error(updateError);
        break;

      case 'delete':
        const { error: deleteError } = await safeQuery(
          supabase.from('trackpay_activities').delete().eq('id', activityData.id)
        );
        if (deleteError) throw new Error(deleteError);
        break;
    }
  }

  // Storage management
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        if (__DEV__) {
          if (__DEV__) { if (__DEV__) console.log(`📥 SyncQueue: Loaded ${this.queue.length} operations from storage`); }
        }
      }
    } catch (error) {
      console.error('❌ SyncQueue: Failed to load queue:', error);
      this.queue = [];
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('❌ SyncQueue: Failed to save queue:', error);
    }
  }

  private async updateSyncStatus(): Promise<void> {
    try {
      const status = {
        lastSync: new Date().toISOString(),
      };
      await AsyncStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify(status));
    } catch (error) {
      console.error('❌ SyncQueue: Failed to update sync status:', error);
    }
  }

  // Event management
  addStatusListener(listener: (status: SyncStatus) => void): () => void {
    this.syncStatusListeners.push(listener);
    return () => {
      this.syncStatusListeners = this.syncStatusListeners.filter(l => l !== listener);
    };
  }

  private notifyStatusListeners(): void {
    this.getStatus().then(status => {
      this.syncStatusListeners.forEach(listener => {
        try {
          listener(status);
        } catch (error) {
          console.error('❌ SyncQueue: Status listener error:', error);
        }
      });
    });
  }

  // Periodic sync
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.processQueue().catch(error => {
        console.error('❌ SyncQueue: Periodic sync failed:', error);
      });
    }, this.SYNC_INTERVAL_MS);
  }

  // Manual operations
  async forcSync(): Promise<void> {
    if (__DEV__) {
      if (__DEV__) { if (__DEV__) console.log('🔄 SyncQueue: Force sync requested'); }
    }
    await this.processQueue();
  }

  async clearQueue(): Promise<void> {
    if (__DEV__) {
      if (__DEV__) { if (__DEV__) console.log('🧹 SyncQueue: Clearing queue'); }
    }
    this.queue = [];
    await this.saveQueue();
    this.notifyStatusListeners();
  }

  async inspectAndCleanQueue(): Promise<void> {
    if (__DEV__) {
      if (__DEV__) { if (__DEV__) console.log('🔍 SyncQueue: Inspecting queue for invalid operations...'); }
    }
    if (__DEV__) {
      if (__DEV__) { if (__DEV__) console.log(`📊 Current queue size: ${this.queue.length} operations`); }
    }

    if (this.queue.length === 0) {
      if (__DEV__) { if (__DEV__) console.log('✅ Queue is empty, nothing to clean'); }
      return;
    }

    // Find operations with invalid timestamp-based IDs
    const invalidOps = this.queue.filter(op => {
      if (op.data && op.data.id) {
        // Check if ID looks like a timestamp (all digits, ~13 chars)
        const isTimestampId = /^\d{13}$/.test(op.data.id.toString());
        if (isTimestampId) {
          if (__DEV__) { if (__DEV__) console.log(`❌ Found invalid operation: ${op.type} ${op.entity} with timestamp ID: ${op.data.id}`); }
        }
        return isTimestampId;
      }
      return false;
    });

    if (invalidOps.length > 0) {
      if (__DEV__) { if (__DEV__) console.log(`🧹 Removing ${invalidOps.length} operations with invalid timestamp IDs`); }

      // Filter out invalid operations
      const originalLength = this.queue.length;
      this.queue = this.queue.filter(op => {
        if (op.data && op.data.id) {
          return !/^\d{13}$/.test(op.data.id.toString());
        }
        return true;
      });

      if (__DEV__) {

        if (__DEV__) { if (__DEV__) console.log(`✅ Filtered queue: ${originalLength} → ${this.queue.length} operations`); }

      }
      await this.saveQueue();
      this.notifyStatusListeners();
    } else {
      if (__DEV__) {
        if (__DEV__) { if (__DEV__) console.log('✅ No invalid operations found in queue'); }
      }
    }
  }

  async retryFailedOperations(): Promise<void> {
    if (__DEV__) {
      if (__DEV__) { if (__DEV__) console.log('🔄 SyncQueue: Retrying failed operations'); }
    }
    const failedOps = this.queue.filter(op => op.status === 'failed');

    for (const op of failedOps) {
      op.status = 'pending';
      op.retryCount = 0;
      op.lastError = undefined;
    }

    await this.saveQueue();
    this.notifyStatusListeners();

    if (await testConnection()) {
      await this.processQueue();
    }
  }

  // Cleanup
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.syncStatusListeners = [];
  }
}

// Export singleton instance
export const syncQueue = SyncQueue.getInstance();
export default syncQueue;