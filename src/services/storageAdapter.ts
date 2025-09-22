// Storage Adapter for TrackPay
// This adapter provides a compatibility layer between existing AsyncStorage operations
// and the new hybrid storage system, enabling gradual migration

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, Session, Payment, ActivityItem } from '../types';
import {
  DatabaseUser,
  DatabaseSession,
  DatabasePayment,
  DatabaseActivity,
  StorageResult
} from './database.interface';

// Legacy storage keys (from existing storage.ts)
export const LEGACY_KEYS = {
  CLIENTS: 'timesheet_clients',
  SESSIONS: 'timesheet_sessions',
  PAYMENTS: 'timesheet_payments',
  ACTIVITIES: 'timesheet_activities',
  USER_ROLE: 'timesheet_user_role',
  CURRENT_USER: 'timesheet_current_user',
};

// Storage adapter class that bridges legacy and new systems
export class StorageAdapter {
  private static instance: StorageAdapter;

  private constructor() {}

  public static getInstance(): StorageAdapter {
    if (!StorageAdapter.instance) {
      StorageAdapter.instance = new StorageAdapter();
    }
    return StorageAdapter.instance;
  }

  // Generic legacy storage functions (matching existing storage.ts)
  async getStorageData<T>(key: string): Promise<T[]> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return [];
    }
  }

  async setStorageData<T>(key: string, data: T[]): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
    }
  }

  // Type converters between legacy and new database formats
  convertClientToUser(client: Client): DatabaseUser {
    return {
      id: client.id,
      name: client.name,
      role: 'client',
      hourly_rate: client.hourlyRate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  convertUserToClient(user: DatabaseUser): Client {
    return {
      id: user.id,
      name: user.name,
      hourlyRate: user.hourly_rate || 0,
    };
  }

  convertSessionToDatabase(session: Session): DatabaseSession {
    const durationMinutes = session.duration ? Math.round(session.duration * 60) : undefined;

    return {
      id: session.id,
      provider_id: 'lucy-provider-id', // Default provider for legacy sessions
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

  convertDatabaseToSession(dbSession: DatabaseSession): Session {
    const duration = dbSession.duration_minutes ? dbSession.duration_minutes / 60 : undefined;

    return {
      id: dbSession.id,
      clientId: dbSession.client_id,
      startTime: new Date(dbSession.start_time),
      endTime: dbSession.end_time ? new Date(dbSession.end_time) : undefined,
      duration,
      hourlyRate: dbSession.hourly_rate,
      amount: dbSession.amount_due,
      status: this.mapDatabaseStatus(dbSession.status),
    };
  }

  convertPaymentToDatabase(payment: Payment, sessionId: string, providerId: string, clientId: string): DatabasePayment {
    return {
      id: payment.id,
      session_id: sessionId,
      provider_id: providerId,
      client_id: clientId,
      amount: payment.amount,
      method: payment.method,
      note: undefined,
      created_at: new Date(payment.paidAt).toISOString(),
    };
  }

  convertDatabaseToPayment(dbPayment: DatabasePayment): Payment {
    return {
      id: dbPayment.id,
      clientId: dbPayment.client_id,
      sessionIds: [dbPayment.session_id], // Legacy format expects array
      amount: dbPayment.amount,
      method: dbPayment.method,
      paidAt: new Date(dbPayment.created_at),
    };
  }

  convertActivityToDatabase(activity: ActivityItem): DatabaseActivity {
    return {
      id: activity.id,
      type: activity.type,
      provider_id: 'lucy-provider-id', // Default provider for legacy activities
      client_id: activity.clientId,
      session_id: undefined,
      data: activity.data,
      created_at: new Date(activity.timestamp).toISOString(),
    };
  }

  convertDatabaseToActivity(dbActivity: DatabaseActivity): ActivityItem {
    return {
      id: dbActivity.id,
      type: dbActivity.type,
      clientId: dbActivity.client_id,
      data: dbActivity.data,
      timestamp: new Date(dbActivity.created_at),
    };
  }

  // Status mapping helpers
  private mapLegacyStatus(status: Session['status']): DatabaseSession['status'] {
    switch (status) {
      case 'active': return 'active';
      case 'unpaid': return 'unpaid';
      case 'requested': return 'requested';
      case 'paid': return 'paid';
      default: return 'unpaid';
    }
  }

  private mapDatabaseStatus(status: DatabaseSession['status']): Session['status'] {
    switch (status) {
      case 'active': return 'active';
      case 'unpaid': return 'unpaid';
      case 'requested': return 'requested';
      case 'paid': return 'paid';
      default: return 'unpaid';
    }
  }

  // Migration utilities
  async exportLegacyData(): Promise<{
    clients: Client[];
    sessions: Session[];
    payments: Payment[];
    activities: ActivityItem[];
    userRole: string | null;
    currentUser: string | null;
  }> {
    const [clients, sessions, payments, activities] = await Promise.all([
      this.getStorageData<Client>(LEGACY_KEYS.CLIENTS),
      this.getStorageData<Session>(LEGACY_KEYS.SESSIONS),
      this.getStorageData<Payment>(LEGACY_KEYS.PAYMENTS),
      this.getStorageData<ActivityItem>(LEGACY_KEYS.ACTIVITIES),
    ]);

    const userRole = await AsyncStorage.getItem(LEGACY_KEYS.USER_ROLE);
    const currentUser = await AsyncStorage.getItem(LEGACY_KEYS.CURRENT_USER);

    return {
      clients,
      sessions,
      payments,
      activities,
      userRole,
      currentUser,
    };
  }

  async importLegacyData(data: {
    clients: Client[];
    sessions: Session[];
    payments: Payment[];
    activities: ActivityItem[];
    userRole?: string | null;
    currentUser?: string | null;
  }): Promise<void> {
    await Promise.all([
      this.setStorageData(LEGACY_KEYS.CLIENTS, data.clients),
      this.setStorageData(LEGACY_KEYS.SESSIONS, data.sessions),
      this.setStorageData(LEGACY_KEYS.PAYMENTS, data.payments),
      this.setStorageData(LEGACY_KEYS.ACTIVITIES, data.activities),
    ]);

    if (data.userRole) {
      await AsyncStorage.setItem(LEGACY_KEYS.USER_ROLE, data.userRole);
    }
    if (data.currentUser) {
      await AsyncStorage.setItem(LEGACY_KEYS.CURRENT_USER, data.currentUser);
    }
  }

  // Helper to generate unique IDs consistent with legacy format
  generateLegacyId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-1-${random}`;
  }

  // Logging helpers for debugging
  logOperation(operation: string, data?: any) {
    console.log(`🔄 StorageAdapter: ${operation}`, data ? JSON.stringify(data, null, 2) : '');
  }

  logError(operation: string, error: any) {
    console.error(`❌ StorageAdapter: ${operation} failed:`, error);
  }

  // Validation helpers
  validateClient(client: Partial<Client>): boolean {
    return !!(client.name && typeof client.hourlyRate === 'number' && client.hourlyRate >= 0);
  }

  validateSession(session: Partial<Session>): boolean {
    return !!(session.clientId && session.startTime && session.hourlyRate);
  }

  validatePayment(payment: Partial<Payment>): boolean {
    return !!(payment.amount && payment.method && payment.sessionIds?.length);
  }

  // Backup and restore functionality
  async createBackup(): Promise<string> {
    const data = await this.exportLegacyData();
    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data,
    };
    return JSON.stringify(backup, null, 2);
  }

  async restoreFromBackup(backupString: string): Promise<void> {
    try {
      const backup = JSON.parse(backupString);
      if (backup.version === '1.0' && backup.data) {
        await this.importLegacyData(backup.data);
        if (__DEV__) {
          console.log('✅ StorageAdapter: Backup restored successfully');
        }
      } else {
        throw new Error('Invalid backup format');
      }
    } catch (error) {
      console.error('❌ StorageAdapter: Failed to restore backup:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{
    asyncStorageWorking: boolean;
    clientsCount: number;
    sessionsCount: number;
    paymentsCount: number;
    activitiesCount: number;
  }> {
    try {
      const [clients, sessions, payments, activities] = await Promise.all([
        this.getStorageData<Client>(LEGACY_KEYS.CLIENTS),
        this.getStorageData<Session>(LEGACY_KEYS.SESSIONS),
        this.getStorageData<Payment>(LEGACY_KEYS.PAYMENTS),
        this.getStorageData<ActivityItem>(LEGACY_KEYS.ACTIVITIES),
      ]);

      return {
        asyncStorageWorking: true,
        clientsCount: clients.length,
        sessionsCount: sessions.length,
        paymentsCount: payments.length,
        activitiesCount: activities.length,
      };
    } catch (error) {
      return {
        asyncStorageWorking: false,
        clientsCount: 0,
        sessionsCount: 0,
        paymentsCount: 0,
        activitiesCount: 0,
      };
    }
  }
}

// Export singleton instance
export const storageAdapter = StorageAdapter.getInstance();
export default storageAdapter;