// Hybrid Storage Service for TrackPay
// Implements dual storage (AsyncStorage + Supabase) with seamless fallback and sync capabilities

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DatabaseInterface,
  DatabaseUser,
  DatabaseSession,
  DatabasePayment,
  DatabaseRelationship,
  DatabaseActivity,
  DatabaseUnpaidBalance,
  StorageResult,
  StorageConfig,
  DatabaseError,
  ConnectionError,
  NotFoundError,
  LegacyClientOperations
} from './database.interface';
import { supabase, testConnection, isSupabaseOnline, safeQuery, Database, getCurrentUser } from './supabase';
import { Client, Session, Payment, ActivityItem } from '../types';
import { LEGACY_KEYS } from './storageAdapter';
import { syncQueue } from './syncQueue';
import { generateUUID } from '../utils/uuid';

// New storage keys for hybrid mode
const HYBRID_KEYS = {
  SYNC_STATUS: 'trackpay_sync_status',
  LAST_SYNC: 'trackpay_last_sync',
  OFFLINE_QUEUE: 'trackpay_offline_queue',
  USER_CACHE: 'trackpay_user_cache',
  SESSION_CACHE: 'trackpay_session_cache',
  CONFIG: 'trackpay_config',
};

export class HybridStorageService implements DatabaseInterface, LegacyClientOperations {
  private config: StorageConfig;
  private offlineQueue: any[] = [];
  private syncStatusListeners: Array<(status: any) => void> = [];
  private syncInProgress = false;
  private currentUserId: string | null = null;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = {
      primary: 'supabase',
      enableOfflineCache: true,
      enableRealtime: true,
      syncInterval: 30000, // 30 seconds
      retryAttempts: 3,
      batchSize: 50,
      ...config,
    };

    // Start periodic sync if enabled
    if (this.config.syncInterval && this.config.primary === 'supabase') {
      setInterval(() => this.sync(), this.config.syncInterval);
    }

    // Initialize connection to sync queue
    this.initializeSyncIntegration();
  }

  // Connection management
  async isOnline(): Promise<boolean> {
    return await testConnection();
  }

  async connect(): Promise<void> {
    try {
      await testConnection();
    } catch (error) {
      throw new ConnectionError('Failed to establish database connection');
    }
  }

  async disconnect(): Promise<void> {
    // Supabase handles connection management automatically
  }

  // Helper methods
  private async getFromAsyncStorage<T>(key: string): Promise<T[]> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error reading from AsyncStorage (${key}):`, error);
      return [];
    }
  }

  private async setToAsyncStorage<T>(key: string, data: T[]): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error writing to AsyncStorage (${key}):`, error);
    }
  }

  private createStorageResult<T>(data: T, isOffline = false): StorageResult<T> {
    return { success: true, data, isOffline };
  }

  private createErrorResult<T>(error: string, isOffline = false): StorageResult<T> {
    return { success: false, error, isOffline };
  }

  private async addToOfflineQueue(operation: any): Promise<void> {
    this.offlineQueue.push({ ...operation, timestamp: Date.now() });
    await this.setToAsyncStorage(HYBRID_KEYS.OFFLINE_QUEUE, this.offlineQueue);
  }

  private async addToSyncQueue(operation: any): Promise<void> {
    try {
      // Convert operation to SyncQueue format
      const queueOp = {
        type: this.mapOperationType(operation.type),
        entity: this.mapEntityType(operation),
        data: operation.data,
        localData: operation.localData,
        maxRetries: 3,
      };

      await syncQueue.addOperation(queueOp);
    } catch (error) {
      console.error('❌ HybridStorage: Failed to add to sync queue:', error);
    }
  }

  private mapOperationType(legacyType: string): 'create' | 'update' | 'delete' {
    if (legacyType.startsWith('create')) return 'create';
    if (legacyType.startsWith('update')) return 'update';
    if (legacyType.startsWith('delete')) return 'delete';
    return 'create'; // default
  }

  private mapEntityType(operation: any): 'client' | 'session' | 'payment' | 'activity' {
    const type = operation.type?.toLowerCase() || '';
    if (type.includes('user') || type.includes('client')) return 'client';
    if (type.includes('session')) return 'session';
    if (type.includes('payment')) return 'payment';
    if (type.includes('activity')) return 'activity';
    return 'client'; // default
  }

  private async initializeSyncIntegration(): Promise<void> {
    // Subscribe to sync queue status updates
    const unsubscribe = syncQueue.addStatusListener((status) => {
      this.syncStatusListeners.forEach(listener => {
        try {
          listener(status);
        } catch (error) {
          console.error('❌ HybridStorage: Sync status listener error:', error);
        }
      });
    });

    // Store unsubscribe function for cleanup
    this.unsubscribeFromSyncQueue = unsubscribe;
  }

  private unsubscribeFromSyncQueue?: () => void;

  // User operations
  async getUsers(): Promise<StorageResult<DatabaseUser[]>> {
    const isOnline = await this.isOnline();

    if (isOnline && this.config.primary === 'supabase') {
      const { data, error } = await safeQuery<Database['public']['Tables']['trackpay_users']['Row'][]>(
        supabase.from('trackpay_users').select('*').order('created_at', { ascending: false })
      );

      if (!error && data) {
        // Cache in AsyncStorage
        if (this.config.enableOfflineCache) {
          await this.setToAsyncStorage(HYBRID_KEYS.USER_CACHE, data);
        }
        return this.createStorageResult(data);
      }
    }

    // Fallback to AsyncStorage cache
    const cachedData = await this.getFromAsyncStorage<DatabaseUser>(HYBRID_KEYS.USER_CACHE);
    return this.createStorageResult(cachedData, true);
  }

  async getUserById(id: string): Promise<StorageResult<DatabaseUser | null>> {
    const isOnline = await this.isOnline();

    if (isOnline && this.config.primary === 'supabase') {
      const { data, error } = await safeQuery<Database['public']['Tables']['trackpay_users']['Row']>(
        supabase.from('trackpay_users').select('*').eq('id', id).single()
      );

      if (!error && data) {
        return this.createStorageResult(data);
      }
    }

    // Fallback to AsyncStorage cache
    const cachedData = await this.getFromAsyncStorage<DatabaseUser>(HYBRID_KEYS.USER_CACHE);
    const user = cachedData.find(u => u.id === id) || null;
    return this.createStorageResult(user, true);
  }

  async getUserByEmail(email: string): Promise<StorageResult<DatabaseUser | null>> {
    const isOnline = await this.isOnline();

    if (isOnline && this.config.primary === 'supabase') {
      const { data, error } = await safeQuery<Database['public']['Tables']['trackpay_users']['Row']>(
        supabase.from('trackpay_users').select('*').eq('email', email).single()
      );

      if (!error && data) {
        return this.createStorageResult(data);
      }
    }

    // Fallback to AsyncStorage cache
    const cachedData = await this.getFromAsyncStorage<DatabaseUser>(HYBRID_KEYS.USER_CACHE);
    const user = cachedData.find(u => u.email === email) || null;
    return this.createStorageResult(user, true);
  }

  async createUser(user: Omit<DatabaseUser, 'id' | 'created_at' | 'updated_at'>): Promise<StorageResult<DatabaseUser>> {
    const isOnline = await this.isOnline();

    if (isOnline && this.config.primary === 'supabase') {
      const { data, error } = await safeQuery<Database['public']['Tables']['trackpay_users']['Row']>(
        supabase.from('trackpay_users').insert([user]).select().single()
      );

      if (!error && data) {
        // Update cache
        if (this.config.enableOfflineCache) {
          const cached = await this.getFromAsyncStorage<DatabaseUser>(HYBRID_KEYS.USER_CACHE);
          cached.push(data);
          await this.setToAsyncStorage(HYBRID_KEYS.USER_CACHE, cached);
        }
        return this.createStorageResult(data);
      }
    }

    // Create temporary user for offline mode
    if (__DEV__) {
      if (__DEV__) { console.log('📴 Offline - user created locally only'); }
    }
    const tempUser: DatabaseUser = {
      ...user,
      id: `temp_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add to cache
    const cached = await this.getFromAsyncStorage<DatabaseUser>(HYBRID_KEYS.USER_CACHE);
    cached.push(tempUser);
    await this.setToAsyncStorage(HYBRID_KEYS.USER_CACHE, cached);

    return this.createStorageResult(tempUser, true);
  }

  async updateUser(id: string, updates: Partial<DatabaseUser>): Promise<StorageResult<DatabaseUser>> {
    const isOnline = await this.isOnline();

    if (isOnline && this.config.primary === 'supabase') {
      const { data, error } = await safeQuery<Database['public']['Tables']['trackpay_users']['Row']>(
        supabase.from('trackpay_users').update(updates).eq('id', id).select().single()
      );

      if (!error && data) {
        // Update cache
        if (this.config.enableOfflineCache) {
          const cached = await this.getFromAsyncStorage<DatabaseUser>(HYBRID_KEYS.USER_CACHE);
          const index = cached.findIndex(u => u.id === id);
          if (index !== -1) {
            cached[index] = data;
            await this.setToAsyncStorage(HYBRID_KEYS.USER_CACHE, cached);
          }
        }
        return this.createStorageResult(data);
      }
    }

    // Update in cache for offline mode
    if (__DEV__) {
      if (__DEV__) { console.log('📴 Offline - user updated locally only'); }
    }
    const cached = await this.getFromAsyncStorage<DatabaseUser>(HYBRID_KEYS.USER_CACHE);
    const index = cached.findIndex(u => u.id === id);
    if (index !== -1) {
      cached[index] = { ...cached[index], ...updates, updated_at: new Date().toISOString() };
      await this.setToAsyncStorage(HYBRID_KEYS.USER_CACHE, cached);
      return this.createStorageResult(cached[index], true);
    }

    return this.createErrorResult('User not found');
  }

  async deleteUser(id: string): Promise<StorageResult<void>> {
    const isOnline = await this.isOnline();

    if (isOnline && this.config.primary === 'supabase') {
      const { error } = await safeQuery(
        supabase.from('trackpay_users').delete().eq('id', id)
      );

      if (!error) {
        // Remove from cache
        if (this.config.enableOfflineCache) {
          const cached = await this.getFromAsyncStorage<DatabaseUser>(HYBRID_KEYS.USER_CACHE);
          const filtered = cached.filter(u => u.id !== id);
          await this.setToAsyncStorage(HYBRID_KEYS.USER_CACHE, filtered);
        }
        return this.createStorageResult(undefined);
      }
    }

    // Remove from cache for offline mode
    if (__DEV__) {
      if (__DEV__) { console.log('📴 Offline - user deleted locally only'); }
    }
    const cached = await this.getFromAsyncStorage<DatabaseUser>(HYBRID_KEYS.USER_CACHE);
    const filtered = cached.filter(u => u.id !== id);
    await this.setToAsyncStorage(HYBRID_KEYS.USER_CACHE, filtered);

    return this.createStorageResult(undefined, true);
  }

  // Relationship operations (simplified implementation)
  async getRelationships(providerId?: string, clientId?: string): Promise<StorageResult<DatabaseRelationship[]>> {
    // Implementation similar to users but for relationships
    return this.createStorageResult([]);
  }

  async createRelationship(providerId: string, clientId: string): Promise<StorageResult<DatabaseRelationship>> {
    const relationship: DatabaseRelationship = {
      id: `temp_${Date.now()}`,
      provider_id: providerId,
      client_id: clientId,
      created_at: new Date().toISOString(),
    };
    return this.createStorageResult(relationship);
  }

  async deleteRelationship(id: string): Promise<StorageResult<void>> {
    return this.createStorageResult(undefined);
  }

  // Session operations (simplified - full implementation follows same pattern)
  async getSessions(filters?: any): Promise<StorageResult<DatabaseSession[]>> {
    return this.createStorageResult([]);
  }

  async getSessionById(id: string): Promise<StorageResult<DatabaseSession | null>> {
    return this.createStorageResult(null);
  }

  async getActiveSession(providerId: string, clientId: string): Promise<StorageResult<DatabaseSession | null>> {
    return this.createStorageResult(null);
  }

  async createSession(session: Omit<DatabaseSession, 'id' | 'created_at' | 'updated_at'>): Promise<StorageResult<DatabaseSession>> {
    const newSession: DatabaseSession = {
      ...session,
      id: `temp_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return this.createStorageResult(newSession);
  }

  async updateSession(id: string, updates: Partial<DatabaseSession>): Promise<StorageResult<DatabaseSession>> {
    return this.createStorageResult({} as DatabaseSession);
  }

  async deleteSession(id: string): Promise<StorageResult<void>> {
    return this.createStorageResult(undefined);
  }

  // Payment operations (simplified)
  async getPayments(filters?: any): Promise<StorageResult<DatabasePayment[]>> {
    return this.createStorageResult([]);
  }

  async getPaymentById(id: string): Promise<StorageResult<DatabasePayment | null>> {
    return this.createStorageResult(null);
  }

  async createPayment(payment: Omit<DatabasePayment, 'id' | 'created_at'>): Promise<StorageResult<DatabasePayment>> {
    const newPayment: DatabasePayment = {
      ...payment,
      id: `temp_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    return this.createStorageResult(newPayment);
  }

  async updatePayment(id: string, updates: Partial<DatabasePayment>): Promise<StorageResult<DatabasePayment>> {
    return this.createStorageResult({} as DatabasePayment);
  }

  async deletePayment(id: string): Promise<StorageResult<void>> {
    return this.createStorageResult(undefined);
  }

  // Activity operations (simplified)
  async getActivities(filters?: any): Promise<StorageResult<DatabaseActivity[]>> {
    return this.createStorageResult([]);
  }

  async createActivity(activity: Omit<DatabaseActivity, 'id' | 'created_at'>): Promise<StorageResult<DatabaseActivity>> {
    const newActivity: DatabaseActivity = {
      ...activity,
      id: `temp_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    return this.createStorageResult(newActivity);
  }

  // Summary operations (simplified)
  async getUnpaidBalances(providerId?: string, clientId?: string): Promise<StorageResult<DatabaseUnpaidBalance[]>> {
    return this.createStorageResult([]);
  }

  async getClientSummary(providerId: string, clientId: string): Promise<StorageResult<any>> {
    return this.createStorageResult({
      totalHours: 0,
      unpaidHours: 0,
      requestedHours: 0,
      unpaidBalance: 0,
      requestedBalance: 0,
      totalUnpaidBalance: 0,
      totalEarned: 0,
      sessionCount: 0,
      unpaidSessionCount: 0,
      requestedSessionCount: 0,
      paidSessionCount: 0,
      hasUnpaidSessions: false,
      hasRequestedSessions: false,
      paymentStatus: 'paid' as const,
    });
  }

  // Migration and sync operations
  async exportData(): Promise<StorageResult<any>> {
    const users = await this.getFromAsyncStorage<DatabaseUser>(HYBRID_KEYS.USER_CACHE);
    return this.createStorageResult({
      users,
      relationships: [],
      sessions: [],
      payments: [],
      activities: [],
    });
  }

  async importData(data: any): Promise<StorageResult<void>> {
    if (data.users) {
      await this.setToAsyncStorage(HYBRID_KEYS.USER_CACHE, data.users);
    }
    return this.createStorageResult(undefined);
  }

  async sync(): Promise<StorageResult<void>> {
    if (this.syncInProgress) {
      return this.createStorageResult(undefined);
    }

    this.syncInProgress = true;

    try {
      const isOnline = await this.isOnline();
      if (!isOnline) {
        return this.createStorageResult(undefined, true);
      }

      // Use SyncQueue for processing instead of local queue
      await syncQueue.processQueue();

      // Also process any legacy offline queue
      const queue = await this.getFromAsyncStorage<any>(HYBRID_KEYS.OFFLINE_QUEUE);
      for (const operation of queue) {
        try {
          await this.processQueuedOperation(operation);
        } catch (error) {
          console.error('Error processing queued operation:', error);
        }
      }

      // Clear processed legacy queue
      await this.setToAsyncStorage(HYBRID_KEYS.OFFLINE_QUEUE, []);

      // Update last sync timestamp
      await AsyncStorage.setItem(HYBRID_KEYS.LAST_SYNC, new Date().toISOString());

      return this.createStorageResult(undefined);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processQueuedOperation(operation: any): Promise<void> {
    // Implementation depends on operation type
    switch (operation.type) {
      case 'createUser':
        await this.createUser(operation.data);
        break;
      case 'updateUser':
        await this.updateUser(operation.id, operation.data);
        break;
      case 'deleteUser':
        await this.deleteUser(operation.id);
        break;
      // Add other operation types as needed
    }
  }

  async clearAllData(): Promise<StorageResult<void>> {
    const keys = Object.values(HYBRID_KEYS);
    await AsyncStorage.multiRemove(keys);
    return this.createStorageResult(undefined);
  }

  // Full Legacy operations for backward compatibility - matches existing storage.ts API exactly

  // ID counter for legacy compatibility
  private static idCounter = 0;

  // Client operations
  async addClient(name: string, hourlyRate: number, email?: string): Promise<Client> {
    if (__DEV__) {
      if (__DEV__) { console.log('📊 HybridStorage: addClient called with name:', name, 'rate:', hourlyRate, 'email:', email); }
    }

    const isOnline = await this.isOnline();

    // Generate proper UUID for Supabase compatibility
    const uniqueId = generateUUID();

    const newClient: Client = {
      id: uniqueId,
      name,
      email: email?.trim() || undefined, // Only include if provided and non-empty
      hourlyRate,
    };

    if (isOnline && this.config.primary === 'supabase') {
      // Try to save to Supabase
      const user = await this.createUser({
        id: uniqueId, // Use the same ID
        name,
        email: email?.trim() || null, // Include email for Supabase
        role: 'client',
        hourly_rate: hourlyRate,
      });

      if (user.success && user.data) {
        if (__DEV__) { console.log('✅ HybridStorage: Client created in Supabase with ID:', user.data.id); }
      }
    } else {
      if (__DEV__) {
        if (__DEV__) { console.log('📴 Offline - client created locally only'); }
      }
    }

    // Always save to AsyncStorage (legacy cache)
    const clients = await this.getFromAsyncStorage<Client>(LEGACY_KEYS.CLIENTS);
    clients.push(newClient);
    await this.setToAsyncStorage(LEGACY_KEYS.CLIENTS, clients);

    if (__DEV__) {

      if (__DEV__) { console.log('✅ HybridStorage: Created client with unique ID:', newClient.id, 'for', newClient.name); }

    }
    return newClient;
  }

  async getClients(): Promise<Client[]> {
    if (__DEV__) {
      if (__DEV__) { console.log('📊 HybridStorage: getClients called'); }
    }

    const isOnline = await this.isOnline();

    if (isOnline && this.config.primary === 'supabase') {
      // Try to get from Supabase first
      const users = await this.getUsers();
      if (users.success && users.data) {
        const clients = users.data
          .filter(u => u.role === 'client')
          .map(u => ({
            id: u.id,
            name: u.name,
            email: u.email || undefined, // Include email if present
            hourlyRate: u.hourly_rate || 0,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

        // Cache in AsyncStorage
        await this.setToAsyncStorage(LEGACY_KEYS.CLIENTS, clients);
        if (__DEV__) {
          if (__DEV__) { console.log('📊 HybridStorage: Loaded clients from Supabase:', clients.length, 'clients'); }
        }
        return clients;
      }
    }

    // Fallback to AsyncStorage
    const clients = await this.getFromAsyncStorage<Client>(LEGACY_KEYS.CLIENTS);
    const sortedClients = clients.sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
    if (__DEV__) {
      if (__DEV__) { console.log('📊 HybridStorage: Loaded clients from AsyncStorage:', sortedClients.length, 'clients'); }
    }
    return sortedClients;
  }

  async getClientById(id: string): Promise<Client | null> {
    if (__DEV__) {
      if (__DEV__) { console.log('🔍 HybridStorage: getClientById called with ID:', id); }
    }
    const clients = await this.getClients();
    if (__DEV__) { console.log('📋 HybridStorage: Available clients:', clients.map(c => ({ id: c.id, name: c.name }))); }
    const foundClient = clients.find(client => client.id === id) || null;
    if (__DEV__) {
      if (__DEV__) { console.log('🎯 HybridStorage: Found client:', foundClient ? foundClient.name : 'NOT FOUND'); }
    }
    return foundClient;
  }

  async updateClient(id: string, name: string, hourlyRate: number, email?: string): Promise<void> {
    if (__DEV__) {
      if (__DEV__) { console.log('✏️ HybridStorage: updateClient called with ID:', id, 'name:', name, 'rate:', hourlyRate, 'email:', email); }
    }

    const isOnline = await this.isOnline();

    if (isOnline && this.config.primary === 'supabase') {
      // Try to update in Supabase
      const updateData: any = { name, hourly_rate: hourlyRate };
      if (email !== undefined) {
        updateData.email = email;
      }
      await this.updateUser(id, updateData);
    } else {
      if (__DEV__) {
        if (__DEV__) { console.log('📴 Offline - client updated locally only'); }
      }
    }

    // Always update in AsyncStorage
    const clients = await this.getFromAsyncStorage<Client>(LEGACY_KEYS.CLIENTS);
    const clientIndex = clients.findIndex(client => client.id === id);

    if (clientIndex === -1) {
      throw new Error('Client not found');
    }

    const updatedClient = {
      ...clients[clientIndex],
      name,
      hourlyRate,
    };

    if (email !== undefined) {
      updatedClient.email = email;
    }

    clients[clientIndex] = updatedClient;

    await this.setToAsyncStorage(LEGACY_KEYS.CLIENTS, clients);
    if (__DEV__) {
      if (__DEV__) { console.log('✅ HybridStorage: Client updated successfully'); }
    }
  }

  // Session operations
  async getSessions(): Promise<Session[]> {
    return await this.getFromAsyncStorage<Session>(LEGACY_KEYS.SESSIONS);
  }

  async getSessionsByClient(clientId: string): Promise<Session[]> {
    const sessions = await this.getSessions();
    return sessions.filter(session => session.clientId === clientId);
  }

  async startSession(clientId: string): Promise<Session> {
    const client = await this.getClientById(clientId);
    if (!client) throw new Error('Client not found');

    const sessions = await this.getSessions();
    const newSession: Session = {
      id: generateUUID(),
      clientId,
      startTime: new Date(),
      hourlyRate: client.hourlyRate,
      status: 'active',
    };

    sessions.push(newSession);
    await this.setToAsyncStorage(LEGACY_KEYS.SESSIONS, sessions);

    // Save to Supabase directly if online
    const isOnline = await this.isOnline();
    if (isOnline && this.config.primary === 'supabase') {
      try {
        const dbSession = await this.convertSessionToDatabase(newSession);
        const { error } = await supabase.from('trackpay_sessions').insert([dbSession]);
        if (error) {
          console.error('❌ Failed to save session to Supabase:', error);
          if (__DEV__) {
            if (__DEV__) { console.log('📱 Session saved locally only - will need manual sync when online'); }
          }
        } else {
          if (__DEV__) {
            if (__DEV__) { console.log('✅ Session saved to Supabase:', newSession.id); }
          }
        }
      } catch (error) {
        console.error('❌ Session save error:', error);
        if (__DEV__) {
          if (__DEV__) { console.log('📱 Session saved locally only'); }
        }
      }
    } else {
      if (__DEV__) {
        if (__DEV__) { console.log('📴 Offline - session saved locally only'); }
      }
    }

    // Add activity
    await this.addActivity({
      type: 'session_start',
      clientId,
      data: { sessionId: newSession.id, startTime: newSession.startTime },
    });

    return newSession;
  }

  async endSession(sessionId: string): Promise<Session> {
    const sessions = await this.getSessions();
    const sessionIndex = sessions.findIndex(session => session.id === sessionId);

    if (sessionIndex === -1) throw new Error('Session not found');

    const session = sessions[sessionIndex];

    // Get the current client data to use the latest hourly rate
    const client = await this.getClientById(session.clientId);
    if (!client) throw new Error('Client not found');

    const endTime = new Date();
    const duration = (endTime.getTime() - new Date(session.startTime).getTime()) / (1000 * 60 * 60); // hours
    const currentRate = client.hourlyRate; // Use current client rate, not session rate
    const amount = duration * currentRate;

    if (__DEV__) { console.log(`💰 HybridStorage: Ending session for ${client.name}: ${duration.toFixed(2)}h × $${currentRate}/h = $${amount.toFixed(2)}`); }

    sessions[sessionIndex] = {
      ...session,
      endTime,
      duration,
      amount,
      hourlyRate: currentRate, // Update to current rate
      status: 'unpaid',
    };

    await this.setToAsyncStorage(LEGACY_KEYS.SESSIONS, sessions);

    // Update session in Supabase directly if online
    const isOnline = await this.isOnline();
    if (isOnline && this.config.primary === 'supabase') {
      try {
        const dbSession = await this.convertSessionToDatabase(sessions[sessionIndex]);
        const { error } = await supabase
          .from('trackpay_sessions')
          .update(dbSession)
          .eq('id', sessions[sessionIndex].id);

        if (error) {
          console.error('❌ Failed to update session in Supabase:', error);
          if (__DEV__) {
            if (__DEV__) { console.log('📱 Session updated locally only - will need manual sync when online'); }
          }
        } else {
          if (__DEV__) {
            if (__DEV__) { console.log('✅ Session updated in Supabase:', sessions[sessionIndex].id); }
          }
        }
      } catch (error) {
        console.error('❌ Session update error:', error);
        if (__DEV__) {
          if (__DEV__) { console.log('📱 Session updated locally only'); }
        }
      }
    } else {
      if (__DEV__) {
        if (__DEV__) { console.log('📴 Offline - session updated locally only'); }
      }
    }

    // Add activity
    await this.addActivity({
      type: 'session_end',
      clientId: session.clientId,
      data: {
        sessionId,
        endTime,
        duration,
        amount,
      },
    });

    return sessions[sessionIndex];
  }

  async getActiveSession(clientId: string): Promise<Session | null> {
    const sessions = await this.getSessions();
    return sessions.find(session =>
      session.clientId === clientId && session.status === 'active'
    ) || null;
  }

  // Payment operations
  async getPayments(): Promise<Payment[]> {
    return await this.getFromAsyncStorage<Payment>(LEGACY_KEYS.PAYMENTS);
  }

  async requestPayment(clientId: string, sessionIds: string[]): Promise<void> {
    const sessions = await this.getSessions();
    const amount = sessions
      .filter(session => sessionIds.includes(session.id))
      .reduce((total, session) => total + (session.amount || 0), 0);

    // Update session statuses to "requested"
    const updatedSessions = sessions.map(session =>
      sessionIds.includes(session.id)
        ? { ...session, status: 'requested' as const }
        : session
    );
    await this.setToAsyncStorage(LEGACY_KEYS.SESSIONS, updatedSessions);

    // Update session statuses in Supabase if online
    const isOnline = await this.isOnline();
    if (isOnline && this.config.primary === 'supabase') {
      try {
        for (const sessionId of sessionIds) {
          const { error } = await supabase
            .from('trackpay_sessions')
            .update({ status: 'requested' })
            .eq('id', sessionId);
          if (error) {
            console.error(`❌ Failed to update session ${sessionId} status to requested in Supabase:`, error);
          }
        }
        if (__DEV__) {
          if (__DEV__) { console.log('✅ Session statuses updated to requested in Supabase'); }
        }
      } catch (error) {
        console.error('❌ Session status update error:', error);
      }
    } else {
      if (__DEV__) {
        if (__DEV__) { console.log('📴 Offline - session statuses updated to requested locally only'); }
      }
    }

    await this.addActivity({
      type: 'payment_request',
      clientId,
      data: { sessionIds, amount },
    });
  }

  async markPaid(
    clientId: string,
    sessionIds: string[],
    amount: number,
    method: Payment['method']
  ): Promise<Payment> {
    const sessions = await this.getSessions();
    const payments = await this.getPayments();

    // Create payment record
    const payment: Payment = {
      id: generateUUID(),
      clientId,
      sessionIds,
      amount,
      method,
      paidAt: new Date(),
    };

    payments.push(payment);
    await this.setToAsyncStorage(LEGACY_KEYS.PAYMENTS, payments);

    // Save payment to Supabase directly if online
    const isOnline = await this.isOnline();
    if (isOnline && this.config.primary === 'supabase') {
      try {
        // Save payment to Supabase
        const dbPayment = {
          id: payment.id,
          client_id: payment.clientId,
          session_ids: payment.sessionIds,
          amount: payment.amount,
          method: payment.method,
          created_at: payment.paidAt.toISOString(),
        };
        const { error: paymentError } = await supabase.from('trackpay_payments').insert([dbPayment]);
        if (paymentError) {
          console.error('❌ Failed to save payment to Supabase:', paymentError);
        } else {
          if (__DEV__) {
            if (__DEV__) { console.log('✅ Payment saved to Supabase:', payment.id); }
          }
        }
      } catch (error) {
        console.error('❌ Payment save error:', error);
      }
    } else {
      if (__DEV__) {
        if (__DEV__) { console.log('📴 Offline - payment saved locally only'); }
      }
    }

    // Update session statuses
    const updatedSessions = sessions.map(session =>
      sessionIds.includes(session.id)
        ? { ...session, status: 'paid' as const }
        : session
    );
    await this.setToAsyncStorage(LEGACY_KEYS.SESSIONS, updatedSessions);

    // Update sessions in Supabase if online
    if (isOnline && this.config.primary === 'supabase') {
      try {
        for (const sessionId of sessionIds) {
          const { error } = await supabase
            .from('trackpay_sessions')
            .update({ status: 'paid' })
            .eq('id', sessionId);
          if (error) {
            console.error(`❌ Failed to update session ${sessionId} status in Supabase:`, error);
          }
        }
        if (__DEV__) {
          if (__DEV__) { console.log('✅ Session statuses updated in Supabase'); }
        }
      } catch (error) {
        console.error('❌ Session status update error:', error);
      }
    } else {
      if (__DEV__) {
        if (__DEV__) { console.log('📴 Offline - session statuses updated locally only'); }
      }
    }

    // Add activity
    await this.addActivity({
      type: 'payment_completed',
      clientId,
      data: { paymentId: payment.id, amount, method },
    });

    return payment;
  }

  // Activity operations
  async getActivities(): Promise<ActivityItem[]> {
    return await this.getFromAsyncStorage<ActivityItem>(LEGACY_KEYS.ACTIVITIES);
  }

  async addActivity(activity: Omit<ActivityItem, 'id' | 'timestamp'>): Promise<void> {
    const activities = await this.getActivities();
    const newActivity: ActivityItem = {
      ...activity,
      id: generateUUID(),
      timestamp: new Date(),
    };

    activities.unshift(newActivity); // Add to beginning for newest first
    await this.setToAsyncStorage(LEGACY_KEYS.ACTIVITIES, activities);

    // Save activity to Supabase directly if online
    const isOnline = await this.isOnline();
    if (isOnline && this.config.primary === 'supabase') {
      try {
        // Get current provider ID for the activity
        const providerId = await this.getCurrentProviderId();

        const dbActivity = {
          id: newActivity.id,
          type: newActivity.type,
          provider_id: providerId,
          client_id: newActivity.clientId,
          session_id: (newActivity.data as any)?.sessionId || null, // Extract session ID if available
          data: newActivity.data,
          created_at: newActivity.timestamp.toISOString(),
        };
        const { error } = await supabase.from('trackpay_activities').insert([dbActivity]);
        if (error) {
          console.error('❌ Failed to save activity to Supabase:', error);
        } else {
          if (__DEV__) {
            if (__DEV__) { console.log('✅ Activity saved to Supabase:', newActivity.id); }
          }
        }
      } catch (error) {
        console.error('❌ Activity save error:', error);
      }
    } else {
      if (__DEV__) {
        if (__DEV__) { console.log('📴 Offline - activity saved locally only'); }
      }
    }
  }

  // Client summary operations (matching existing storage.ts)
  async getClientSummary(clientId: string): Promise<{
    totalHours: number;
    unpaidHours: number;
    requestedHours: number;
    unpaidBalance: number;
    requestedBalance: number;
    totalUnpaidBalance: number;
    totalEarned: number;
    sessionCount: number;
    unpaidSessionCount: number;
    requestedSessionCount: number;
    paidSessionCount: number;
    hasUnpaidSessions: boolean;
    hasRequestedSessions: boolean;
    paymentStatus: 'unpaid' | 'requested' | 'paid';
  }> {
    const sessions = await this.getSessionsByClient(clientId);
    const unpaidSessions = sessions.filter(session => session.status === 'unpaid');
    const requestedSessions = sessions.filter(session => session.status === 'requested');
    const paidSessions = sessions.filter(session => session.status === 'paid');

    const totalHours = sessions.reduce((total, session) => total + (session.duration || 0), 0);
    const unpaidHours = unpaidSessions.reduce((total, session) => total + (session.duration || 0), 0);
    const requestedHours = requestedSessions.reduce((total, session) => total + (session.duration || 0), 0);
    const unpaidBalance = unpaidSessions.reduce((total, session) => total + (session.amount || 0), 0);
    const requestedBalance = requestedSessions.reduce((total, session) => total + (session.amount || 0), 0);
    const totalEarned = sessions.reduce((total, session) => total + (session.amount || 0), 0);

    return {
      totalHours,
      unpaidHours,
      requestedHours,
      unpaidBalance,
      requestedBalance,
      totalUnpaidBalance: unpaidBalance + requestedBalance,
      totalEarned,
      sessionCount: sessions.length,
      unpaidSessionCount: unpaidSessions.length,
      requestedSessionCount: requestedSessions.length,
      paidSessionCount: paidSessions.length,
      hasUnpaidSessions: unpaidSessions.length > 0,
      hasRequestedSessions: requestedSessions.length > 0,
      paymentStatus: unpaidSessions.length > 0 ? 'unpaid' :
                     requestedSessions.length > 0 ? 'requested' : 'paid'
    };
  }

  // Client-side operations for viewing service providers (legacy)
  async getServiceProvidersForClient(clientName: string): Promise<any[]> {
    const clients = await this.getClients();
    const client = clients.find(c => c.name === clientName);

    if (!client) {
      return [];
    }

    const summary = await this.getClientSummary(client.id);

    return [
      {
        id: 'lucy',
        name: 'Lucy',
        unpaidHours: summary.unpaidHours,
        requestedHours: summary.requestedHours,
        unpaidBalance: summary.unpaidBalance,
        requestedBalance: summary.requestedBalance,
        totalUnpaidBalance: summary.totalUnpaidBalance,
        hasUnpaidSessions: summary.hasUnpaidSessions,
        hasRequestedSessions: summary.hasRequestedSessions,
        paymentStatus: summary.paymentStatus,
      },
    ];
  }

  async getClientSessionsForProvider(clientName: string, providerId: string): Promise<Session[]> {
    const clients = await this.getClients();
    const client = clients.find(c => c.name === clientName);

    if (!client) {
      return [];
    }

    return await this.getSessionsByClient(client.id);
  }

  // User role operations (legacy compatibility)
  async getUserRole(): Promise<'provider' | 'client'> {
    try {
      const role = await AsyncStorage.getItem(LEGACY_KEYS.USER_ROLE);
      return role as 'provider' | 'client' || 'provider';
    } catch {
      return 'provider';
    }
  }

  async setUserRole(role: 'provider' | 'client'): Promise<void> {
    await AsyncStorage.setItem(LEGACY_KEYS.USER_ROLE, role);
  }

  async getCurrentUser(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LEGACY_KEYS.CURRENT_USER);
    } catch {
      return null;
    }
  }

  async setCurrentUser(userName: string): Promise<void> {
    await AsyncStorage.setItem(LEGACY_KEYS.CURRENT_USER, userName);
  }

  // Seed data initialization (matching existing storage.ts)
  async initializeWithSeedData(): Promise<void> {
    if (__DEV__) {
      if (__DEV__) { console.log('🌱 HybridStorage: Initializing seed data...'); }
    }
    const clients = await this.getClients();
    if (__DEV__) {
      if (__DEV__) { console.log('🌱 HybridStorage: Current clients count:', clients.length); }
    }

    if (clients.length > 0) {
      if (__DEV__) { console.log('🌱 HybridStorage: Seed data already exists, skipping initialization'); }
      return;
    }

    if (__DEV__) {

      if (__DEV__) { console.log('🌱 HybridStorage: No existing data, creating seed data...'); }

    }

    // Add sample clients with delay to prevent ID collision
    const client1 = await this.addClient('Molly Johnson', 45);
    await new Promise(resolve => setTimeout(resolve, 10));

    const client2 = await this.addClient('Sarah Davis', 35);
    await new Promise(resolve => setTimeout(resolve, 10));

    const client3 = await this.addClient('Mike Wilson', 50);
    await new Promise(resolve => setTimeout(resolve, 10));

    const client4 = await this.addClient('Adda Smith', 40);

    // Add sample sessions (simplified - matching legacy format)
    const sessions = await this.getSessions();
    const sampleSessions: Session[] = [
      {
        id: 'session1',
        clientId: client1.id,
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        duration: 4,
        hourlyRate: 45,
        amount: 180,
        status: 'paid',
      },
      {
        id: 'session2',
        clientId: client1.id,
        startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3.5 * 60 * 60 * 1000),
        duration: 3.5,
        hourlyRate: 45,
        amount: 157.5,
        status: 'unpaid',
      },
      {
        id: 'session3',
        clientId: client2.id,
        startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
        duration: 6,
        hourlyRate: 35,
        amount: 210,
        status: 'unpaid',
      },
      {
        id: 'session4',
        clientId: client1.id,
        startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        duration: 2,
        hourlyRate: 45,
        amount: 90,
        status: 'requested',
      },
      {
        id: 'session5',
        clientId: client3.id,
        startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
        duration: 5,
        hourlyRate: 50,
        amount: 250,
        status: 'paid',
      },
      {
        id: 'session6',
        clientId: client4.id,
        startTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 6 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        duration: 3,
        hourlyRate: 40,
        amount: 120,
        status: 'unpaid',
      },
    ];

    await this.setToAsyncStorage(LEGACY_KEYS.SESSIONS, [...sessions, ...sampleSessions]);

    // Add sample activities
    const activities: ActivityItem[] = [
      {
        id: 'activity1',
        type: 'session_end',
        clientId: client1.id,
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3.5 * 60 * 60 * 1000),
        data: { sessionId: 'session2', duration: 3.5, amount: 157.5 },
      },
      {
        id: 'activity2',
        type: 'session_end',
        clientId: client2.id,
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
        data: { sessionId: 'session3', duration: 6, amount: 210 },
      },
    ];

    await this.setToAsyncStorage(LEGACY_KEYS.ACTIVITIES, activities);

    if (__DEV__) {

      if (__DEV__) { console.log('✅ HybridStorage: Seed data initialization completed successfully!'); }

    }
    if (__DEV__) {
      if (__DEV__) { console.log('✅ HybridStorage: Created clients:', [client1.name, client2.name, client3.name, client4.name]); }
    }
  }

  async clearAllDataAndReinitialize(): Promise<void> {
    if (__DEV__) {
      if (__DEV__) { console.log('🧹 HybridStorage: Clearing all data and reinitializing...'); }
    }

    // Clear AsyncStorage
    await AsyncStorage.multiRemove([
      LEGACY_KEYS.CLIENTS,
      LEGACY_KEYS.SESSIONS,
      LEGACY_KEYS.PAYMENTS,
      LEGACY_KEYS.ACTIVITIES,
    ]);

    // Reset ID counter
    HybridStorageService.idCounter = 0;

    if (__DEV__) {

      if (__DEV__) { console.log('🧹 HybridStorage: All data cleared, reinitializing...'); }

    }
    await this.initializeWithSeedData();
    if (__DEV__) {
      if (__DEV__) { console.log('✅ HybridStorage: Data cleared and reinitialized successfully!'); }
    }
  }

  // Session conversion methods
  private async convertSessionToDatabase(session: Session, providerId?: string): Promise<DatabaseSession> {
    const durationMinutes = session.duration ? Math.round(session.duration * 60) : undefined;

    // Get provider ID from parameter, current user, or fallback to Lucy's ID
    let provider_id = providerId;
    if (!provider_id) {
      provider_id = await this.getCurrentProviderId();
    }

    return {
      id: session.id,
      provider_id: provider_id,
      client_id: session.clientId,
      start_time: new Date(session.startTime).toISOString(),
      end_time: session.endTime ? new Date(session.endTime).toISOString() : undefined,
      duration_minutes: durationMinutes,
      hourly_rate: session.hourlyRate,
      amount_due: session.amount,
      status: this.mapLegacyStatus(session.status),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Get the current authenticated user's provider ID
   */
  private async getCurrentProviderId(): Promise<string> {
    try {
      // First, try to get from Supabase auth
      const user = await getCurrentUser();
      if (user) {
        // Try to find the corresponding trackpay user by auth_user_id
        const { data: trackpayUsers } = await supabase
          .from('trackpay_users')
          .select('id')
          .eq('auth_user_id', user.id)
          .eq('role', 'provider')
          .limit(1);

        if (trackpayUsers && trackpayUsers.length > 0) {
          return trackpayUsers[0].id;
        }
      }

      // Fallback: Try to get from local storage
      const currentUser = await this.getCurrentUser();
      if (currentUser) {
        const usersResult = await this.getUsers();
        if (usersResult.success && usersResult.data) {
          const provider = usersResult.data.find(u =>
            (u.name === currentUser || u.email === currentUser) && u.role === 'provider'
          );
          if (provider) {
            return provider.id;
          }
        }
      }

      // Final fallback: Use Lucy's provider ID for backward compatibility
      if (__DEV__) {
        if (__DEV__) { console.warn('⚠️ Could not determine current provider ID, using fallback'); }
      }
      return '550e8400-e29b-41d4-a716-446655440000'; // Lucy Provider UUID
    } catch (error) {
      console.error('❌ Error getting current provider ID:', error);
      // Final fallback: Use Lucy's provider ID
      return '550e8400-e29b-41d4-a716-446655440000'; // Lucy Provider UUID
    }
  }

  private mapLegacyStatus(status: string): string {
    switch (status) {
      case 'active':
        return 'active';
      case 'unpaid':
        return 'completed';
      case 'requested':
        return 'payment_requested';
      case 'paid':
        return 'paid';
      default:
        return 'completed';
    }
  }

  // Sync queue integration methods
  addSyncStatusListener(listener: (status: any) => void): () => void {
    this.syncStatusListeners.push(listener);
    return () => {
      this.syncStatusListeners = this.syncStatusListeners.filter(l => l !== listener);
    };
  }

  async getSyncStatus(): Promise<any> {
    return await syncQueue.getStatus();
  }

  async forcSync(): Promise<void> {
    await syncQueue.forcSync();
    await this.sync();
  }

  async retryFailedOperations(): Promise<void> {
    await syncQueue.retryFailedOperations();
  }

  async clearSyncQueue(): Promise<void> {
    if (__DEV__) {
      if (__DEV__) { console.log('🧹 HybridStorage: Comprehensive sync queue cleanup starting...'); }
    }

    try {
      // First, inspect and clean invalid operations
      await syncQueue.inspectAndCleanQueue();
      if (__DEV__) {
        if (__DEV__) { console.log('✅ Inspected and cleaned invalid operations'); }
      }

      // Clear the main SyncQueue
      await syncQueue.clearQueue();
      if (__DEV__) {
        if (__DEV__) {
          console.log('✅ Cleared main SyncQueue');
        }
      }

      // Clear the HybridStorage offline queue
      await this.setToAsyncStorage(HYBRID_KEYS.OFFLINE_QUEUE, []);
      if (__DEV__) {
        if (__DEV__) {
          console.log('✅ Cleared offline queue');
        }
      }

      // Clear all possible sync-related storage keys (including legacy ones)
      const allSyncKeys = [
        // Current keys
        'trackpay_sync_queue',
        'trackpay_offline_queue',
        'trackpay_sync_status',

        // Legacy/alternative keys that might exist
        'trackpay-sync-queue',
        'trackpay-sync-queue-hybrid',
        '@trackpay/sync-queue',
        'hybrid-sync-queue',

        // Additional potential keys
        'trackpay_sync_operations',
        'trackpay-sync-operations'
      ];

      for (const key of allSyncKeys) {
        try {
          await AsyncStorage.removeItem(key);
          if (__DEV__) {
            if (__DEV__) {
              console.log(`✅ Cleared storage key: ${key}`);
            }
          }
        } catch (error) {
          if (__DEV__) {
            if (__DEV__) {
              console.warn(`⚠️ Could not clear key ${key}:`, error);
            }
          }
        }
      }

      // Reset local queue state
      this.offlineQueue = [];

      if (__DEV__) {

        if (__DEV__) {
          console.log('✅ HybridStorage: Comprehensive sync queue cleanup completed');
        }

      }

    } catch (error) {
      console.error('❌ HybridStorage: Sync queue cleanup failed:', error);
      throw error;
    }
  }

  async inspectSyncQueue(): Promise<void> {
    await syncQueue.inspectAndCleanQueue();
  }

  // Cleanup method
  destroy(): void {
    if (this.unsubscribeFromSyncQueue) {
      this.unsubscribeFromSyncQueue();
    }
    this.syncStatusListeners = [];
  }
}

// Create singleton instance
export const hybridStorage = new HybridStorageService();
export default hybridStorage;