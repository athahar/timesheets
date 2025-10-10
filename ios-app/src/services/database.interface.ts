// Database Interface for TrackPay
// This interface abstracts storage operations to support both AsyncStorage and Supabase

import { Client, Session, Payment, ActivityItem } from '../types';

// Enhanced types for Supabase schema
export interface DatabaseUser {
  id: string;
  name: string;
  email?: string;
  role: 'provider' | 'client';
  hourly_rate?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseSession {
  id: string;
  provider_id: string;
  client_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  hourly_rate: number;
  amount_due?: number;
  status: 'active' | 'unpaid' | 'requested' | 'paid';
  created_at?: string;
  updated_at?: string;
}

export interface DatabasePayment {
  id: string;
  session_id: string;
  provider_id: string;
  client_id: string;
  amount: number;
  method: 'cash' | 'zelle' | 'paypal' | 'bank_transfer' | 'other';
  note?: string;
  created_at?: string;
}

export interface DatabaseRelationship {
  id: string;
  provider_id: string;
  client_id: string;
  created_at?: string;
}

export interface DatabaseActivity {
  id: string;
  type: string;
  provider_id: string;
  client_id: string;
  session_id?: string;
  data?: any;
  created_at?: string;
}

export interface DatabaseUnpaidBalance {
  client_id: string;
  provider_id: string;
  unpaid_balance: number;
  unpaid_sessions_count: number;
  requested_sessions_count: number;
  unpaid_minutes: number;
}

// Storage operation results
export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  isOffline?: boolean;
}

// Abstract database interface
export interface DatabaseInterface {
  // Connection management
  isOnline(): Promise<boolean>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // User operations
  getUsers(): Promise<StorageResult<DatabaseUser[]>>;
  getUserById(id: string): Promise<StorageResult<DatabaseUser | null>>;
  getUserByEmail(email: string): Promise<StorageResult<DatabaseUser | null>>;
  createUser(user: Omit<DatabaseUser, 'id' | 'created_at' | 'updated_at'>): Promise<StorageResult<DatabaseUser>>;
  updateUser(id: string, updates: Partial<DatabaseUser>): Promise<StorageResult<DatabaseUser>>;
  deleteUser(id: string): Promise<StorageResult<void>>;

  // Client-Provider relationship operations
  getRelationships(providerId?: string, clientId?: string): Promise<StorageResult<DatabaseRelationship[]>>;
  createRelationship(providerId: string, clientId: string): Promise<StorageResult<DatabaseRelationship>>;
  deleteRelationship(id: string): Promise<StorageResult<void>>;

  // Session operations
  getSessions(filters?: {
    providerId?: string;
    clientId?: string;
    status?: DatabaseSession['status'];
    startDate?: string;
    endDate?: string;
  }): Promise<StorageResult<DatabaseSession[]>>;
  getSessionById(id: string): Promise<StorageResult<DatabaseSession | null>>;
  getActiveSession(providerId: string, clientId: string): Promise<StorageResult<DatabaseSession | null>>;
  createSession(session: Omit<DatabaseSession, 'id' | 'created_at' | 'updated_at'>): Promise<StorageResult<DatabaseSession>>;
  updateSession(id: string, updates: Partial<DatabaseSession>): Promise<StorageResult<DatabaseSession>>;
  deleteSession(id: string): Promise<StorageResult<void>>;

  // Payment operations
  getPayments(filters?: {
    providerId?: string;
    clientId?: string;
    sessionId?: string;
  }): Promise<StorageResult<DatabasePayment[]>>;
  getPaymentById(id: string): Promise<StorageResult<DatabasePayment | null>>;
  createPayment(payment: Omit<DatabasePayment, 'id' | 'created_at'>): Promise<StorageResult<DatabasePayment>>;
  updatePayment(id: string, updates: Partial<DatabasePayment>): Promise<StorageResult<DatabasePayment>>;
  deletePayment(id: string): Promise<StorageResult<void>>;

  // Activity operations
  getActivities(filters?: {
    providerId?: string;
    clientId?: string;
    sessionId?: string;
    type?: string;
  }): Promise<StorageResult<DatabaseActivity[]>>;
  createActivity(activity: Omit<DatabaseActivity, 'id' | 'created_at'>): Promise<StorageResult<DatabaseActivity>>;

  // Summary operations
  getUnpaidBalances(providerId?: string, clientId?: string): Promise<StorageResult<DatabaseUnpaidBalance[]>>;
  getClientSummary(providerId: string, clientId: string): Promise<StorageResult<{
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
  }>>;

  // Migration and sync operations
  exportData(): Promise<StorageResult<{
    users: DatabaseUser[];
    relationships: DatabaseRelationship[];
    sessions: DatabaseSession[];
    payments: DatabasePayment[];
    activities: DatabaseActivity[];
  }>>;
  importData(data: {
    users?: DatabaseUser[];
    relationships?: DatabaseRelationship[];
    sessions?: DatabaseSession[];
    payments?: DatabasePayment[];
    activities?: DatabaseActivity[];
  }): Promise<StorageResult<void>>;
  sync(): Promise<StorageResult<void>>;
  clearAllData(): Promise<StorageResult<void>>;
}

// Legacy client operations (for backward compatibility with existing app)
export interface LegacyClientOperations {
  // Legacy types for existing app compatibility
  addClient(name: string, hourlyRate: number): Promise<Client>;
  getClients(): Promise<Client[]>;
  getClientById(id: string): Promise<Client | null>;
  updateClient(id: string, name: string, hourlyRate: number, email?: string): Promise<void>;

  // Legacy session operations
  startSession(clientId: string): Promise<Session>;
  endSession(sessionId: string): Promise<Session>;
  getActiveSession(clientId: string): Promise<Session | null>;
  getSessions(): Promise<Session[]>;
  getSessionsByClient(clientId: string): Promise<Session[]>;

  // Legacy payment operations
  requestPayment(clientId: string, sessionIds: string[]): Promise<void>;
  markPaid(clientId: string, sessionIds: string[], amount: number, method: Payment['method']): Promise<Payment>;
  getPayments(): Promise<Payment[]>;

  // Legacy activity operations
  getActivities(): Promise<ActivityItem[]>;
  addActivity(activity: Omit<ActivityItem, 'id' | 'timestamp'>): Promise<void>;

  // Legacy summary operations
  getClientSummary(clientId: string): Promise<{
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
  }>;

  // Legacy client-side operations
  getServiceProvidersForClient(clientName: string): Promise<any[]>;
  getClientSessionsForProvider(clientName: string, providerId: string): Promise<Session[]>;

  // Legacy initialization
  initializeWithSeedData(): Promise<void>;
  clearAllDataAndReinitialize(): Promise<void>;
}

// Storage configuration
export interface StorageConfig {
  primary: 'asyncstorage' | 'supabase';
  enableOfflineCache: boolean;
  enableRealtime: boolean;
  syncInterval?: number; // milliseconds
  retryAttempts?: number;
  batchSize?: number;
}

// Error types
export class DatabaseError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string = 'Database connection failed') {
    super(message, 'CONNECTION_ERROR');
    this.name = 'ConnectionError';
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DatabaseError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DatabaseError {
  constructor(message: string) {
    super(message, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}