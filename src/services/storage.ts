import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, Session, Payment, ActivityItem } from '../types';

const KEYS = {
  CLIENTS: 'timesheet_clients',
  SESSIONS: 'timesheet_sessions',
  PAYMENTS: 'timesheet_payments',
  ACTIVITIES: 'timesheet_activities',
  USER_ROLE: 'timesheet_user_role', // 'provider' or 'client'
  CURRENT_USER: 'timesheet_current_user', // Current user name
};

// ID counter to ensure uniqueness
let idCounter = 0;

// Generic storage functions
const getStorageData = async <T>(key: string): Promise<T[]> => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error getting ${key}:`, error);
    return [];
  }
};

const setStorageData = async <T>(key: string, data: T[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
  }
};

// Client functions
export const getClients = async (): Promise<Client[]> => {
  if (__DEV__) {
    console.log('📊 Storage: getClients called');
  }
  const clients = await getStorageData<Client>(KEYS.CLIENTS);
  if (__DEV__) {
    console.log('📊 Storage: Loaded clients from storage:', clients.length, 'clients');
  }
  return clients;
};

export const addClient = async (name: string, hourlyRate: number): Promise<Client> => {
  const clients = await getClients();

  // Generate guaranteed unique ID by combining timestamp, counter, and random number
  idCounter++;
  const uniqueId = `${Date.now()}-${idCounter}-${Math.random().toString(36).substr(2, 9)}`;

  const newClient: Client = {
    id: uniqueId,
    name,
    hourlyRate,
  };

  clients.push(newClient);
  await setStorageData(KEYS.CLIENTS, clients);
  if (__DEV__) {
    if (__DEV__) { console.log('✅ Storage: Created client with unique ID:', newClient.id, 'for', newClient.name); }
  }
  return newClient;
};

export const getClientById = async (id: string): Promise<Client | null> => {
  if (__DEV__) {
    if (__DEV__) { console.log('🔍 Storage: getClientById called with ID:', id); }
  }
  const clients = await getClients();
  if (__DEV__) { console.log('📋 Storage: Available clients:', clients.map(c => ({ id: c.id, name: c.name }))); }
  const foundClient = clients.find(client => client.id === id) || null;
  if (__DEV__) {
    if (__DEV__) { console.log('🎯 Storage: Found client:', foundClient ? foundClient.name : 'NOT FOUND'); }
  }
  return foundClient;
};

export const updateClient = async (id: string, name: string, hourlyRate: number): Promise<void> => {
  if (__DEV__) {
    if (__DEV__) { console.log('✏️ Storage: updateClient called with ID:', id, 'name:', name, 'rate:', hourlyRate); }
  }
  const clients = await getClients();
  const clientIndex = clients.findIndex(client => client.id === id);

  if (clientIndex === -1) {
    throw new Error('Client not found');
  }

  clients[clientIndex] = {
    ...clients[clientIndex],
    name,
    hourlyRate,
  };

  await setStorageData(KEYS.CLIENTS, clients);
  if (__DEV__) {
    if (__DEV__) { console.log('✅ Storage: Client updated successfully'); }
  }
};

// Session functions
export const getSessions = (): Promise<Session[]> => getStorageData<Session>(KEYS.SESSIONS);

export const getSessionsByClient = async (clientId: string): Promise<Session[]> => {
  const sessions = await getSessions();
  return sessions.filter(session => session.clientId === clientId);
};

export const startSession = async (clientId: string): Promise<Session> => {
  const client = await getClientById(clientId);
  if (!client) throw new Error('Client not found');

  const sessions = await getSessions();
  const newSession: Session = {
    id: Date.now().toString(),
    clientId,
    startTime: new Date(),
    hourlyRate: client.hourlyRate,
    status: 'active',
  };

  sessions.push(newSession);
  await setStorageData(KEYS.SESSIONS, sessions);

  // Add activity
  await addActivity({
    type: 'session_start',
    clientId,
    data: { sessionId: newSession.id, startTime: newSession.startTime },
  });

  return newSession;
};

export const endSession = async (sessionId: string): Promise<Session> => {
  const sessions = await getSessions();
  const sessionIndex = sessions.findIndex(session => session.id === sessionId);

  if (sessionIndex === -1) throw new Error('Session not found');

  const session = sessions[sessionIndex];
  const endTime = new Date();
  const duration = (endTime.getTime() - new Date(session.startTime).getTime()) / (1000 * 60 * 60); // hours
  const amount = duration * session.hourlyRate;

  sessions[sessionIndex] = {
    ...session,
    endTime,
    duration,
    amount,
    status: 'unpaid',
  };

  await setStorageData(KEYS.SESSIONS, sessions);

  // Add activity
  await addActivity({
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
};

export const getActiveSession = async (clientId: string): Promise<Session | null> => {
  const sessions = await getSessions();
  return sessions.find(session =>
    session.clientId === clientId && session.status === 'active'
  ) || null;
};

// Payment functions
export const getPayments = (): Promise<Payment[]> => getStorageData<Payment>(KEYS.PAYMENTS);

export const requestPayment = async (clientId: string, sessionIds: string[]): Promise<void> => {
  const sessions = await getSessions();
  const amount = sessions
    .filter(session => sessionIds.includes(session.id))
    .reduce((total, session) => total + (session.amount || 0), 0);

  // Update session statuses to "requested"
  const updatedSessions = sessions.map(session =>
    sessionIds.includes(session.id)
      ? { ...session, status: 'requested' as const }
      : session
  );
  await setStorageData(KEYS.SESSIONS, updatedSessions);

  await addActivity({
    type: 'payment_request',
    clientId,
    data: { sessionIds, amount },
  });
};

export const markPaid = async (
  clientId: string,
  sessionIds: string[],
  amount: number,
  method: Payment['method']
): Promise<Payment> => {
  const sessions = await getSessions();
  const payments = await getPayments();

  // Create payment record
  const payment: Payment = {
    id: Date.now().toString(),
    clientId,
    sessionIds,
    amount,
    method,
    paidAt: new Date(),
  };

  payments.push(payment);
  await setStorageData(KEYS.PAYMENTS, payments);

  // Update session statuses
  const updatedSessions = sessions.map(session =>
    sessionIds.includes(session.id)
      ? { ...session, status: 'paid' as const }
      : session
  );
  await setStorageData(KEYS.SESSIONS, updatedSessions);

  // Add activity
  await addActivity({
    type: 'payment_completed',
    clientId,
    data: { paymentId: payment.id, amount, method },
  });

  return payment;
};

// Activity functions
export const getActivities = (): Promise<ActivityItem[]> => getStorageData<ActivityItem>(KEYS.ACTIVITIES);

export const addActivity = async (activity: Omit<ActivityItem, 'id' | 'timestamp'>): Promise<void> => {
  const activities = await getActivities();
  const newActivity: ActivityItem = {
    ...activity,
    id: Date.now().toString(),
    timestamp: new Date(),
  };

  activities.unshift(newActivity); // Add to beginning for newest first
  await setStorageData(KEYS.ACTIVITIES, activities);
};

// User role functions
export const getUserRole = async (): Promise<'provider' | 'client'> => {
  try {
    const role = await AsyncStorage.getItem(KEYS.USER_ROLE);
    return role as 'provider' | 'client' || 'provider';
  } catch {
    return 'provider';
  }
};

export const setUserRole = async (role: 'provider' | 'client'): Promise<void> => {
  await AsyncStorage.setItem(KEYS.USER_ROLE, role);
};

// Current user functions
export const getCurrentUser = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(KEYS.CURRENT_USER);
  } catch {
    return null;
  }
};

export const setCurrentUser = async (userName: string): Promise<void> => {
  await AsyncStorage.setItem(KEYS.CURRENT_USER, userName);
};

// Summary functions
export const getClientSummary = async (clientId: string) => {
  const sessions = await getSessionsByClient(clientId);
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
    totalUnpaidBalance: unpaidBalance + requestedBalance, // Total owed (unpaid + requested)
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
};

// Client-side functions for viewing service providers
export const getServiceProvidersForClient = async (clientName: string) => {
  // For the prototype, we'll return Lucy as the primary service provider
  // In a real app, you'd have a proper client-provider relationship table
  const clients = await getClients();
  const client = clients.find(c => c.name === clientName);

  if (!client) {
    return [];
  }

  // Get detailed summary for this client
  const summary = await getClientSummary(client.id);

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
};

export const getClientSessionsForProvider = async (clientName: string, providerId: string) => {
  // Get the client by name
  const clients = await getClients();
  const client = clients.find(c => c.name === clientName);

  if (!client) {
    return [];
  }

  // For the prototype, return all sessions for this client
  // In a real app, you'd filter by provider as well
  return await getSessionsByClient(client.id);
};

// Seed data function
export const initializeWithSeedData = async (): Promise<void> => {
  if (__DEV__) {
    if (__DEV__) { console.log('🌱 Storage: Initializing seed data...'); }
  }
  const clients = await getClients();
  if (__DEV__) {
    if (__DEV__) { console.log('🌱 Storage: Current clients count:', clients.length); }
  }
  if (clients.length > 0) {
    if (__DEV__) { console.log('🌱 Storage: Seed data already exists, skipping initialization'); }
    return; // Already has data
  }
  if (__DEV__) {
    if (__DEV__) { console.log('🌱 Storage: No existing data, creating seed data...'); }
  }

  // Add sample clients with delay to prevent ID collision
  const client1 = await addClient('Molly Johnson', 45);
  await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay

  const client2 = await addClient('Sarah Davis', 35);
  await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay

  const client3 = await addClient('Mike Wilson', 50);
  await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay

  const client4 = await addClient('Adda Smith', 40);

  // Add some completed sessions
  const sessions = await getSessions();
  const sampleSessions: Session[] = [
    {
      id: 'session1',
      clientId: client1.id,
      startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
      duration: 4,
      hourlyRate: 45,
      amount: 180,
      status: 'paid',
    },
    {
      id: 'session2',
      clientId: client1.id,
      startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3.5 * 60 * 60 * 1000), // 3.5 hours later
      duration: 3.5,
      hourlyRate: 45,
      amount: 157.5,
      status: 'unpaid',
    },
    {
      id: 'session3',
      clientId: client2.id,
      startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      endTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // 6 hours later
      duration: 6,
      hourlyRate: 35,
      amount: 210,
      status: 'unpaid',
    },
    {
      id: 'session4',
      clientId: client1.id,
      startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
      duration: 2,
      hourlyRate: 45,
      amount: 90,
      status: 'requested',
    },
    {
      id: 'session5',
      clientId: client3.id,
      startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000), // 5 hours later
      duration: 5,
      hourlyRate: 50,
      amount: 250,
      status: 'paid',
    },
    {
      id: 'session6',
      clientId: client4.id,
      startTime: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      endTime: new Date(Date.now() - 6 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
      duration: 3,
      hourlyRate: 40,
      amount: 120,
      status: 'unpaid',
    },
  ];

  await setStorageData(KEYS.SESSIONS, [...sessions, ...sampleSessions]);

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

  await setStorageData(KEYS.ACTIVITIES, activities);

  if (__DEV__) {

    if (__DEV__) { console.log('✅ Storage: Seed data initialization completed successfully!'); }

  }
  if (__DEV__) {
    if (__DEV__) { console.log('✅ Storage: Created clients:', [client1.name, client2.name, client3.name, client4.name]); }
  }
};

// Function to force clear all data and reinitialize
export const clearAllDataAndReinitialize = async (): Promise<void> => {
  if (__DEV__) {
    if (__DEV__) { console.log('🧹 Storage: Clearing all data and reinitializing...'); }
  }

  // Clear all storage
  await AsyncStorage.multiRemove([
    KEYS.CLIENTS,
    KEYS.SESSIONS,
    KEYS.PAYMENTS,
    KEYS.ACTIVITIES,
  ]);

  // Reset ID counter
  idCounter = 0;

  if (__DEV__) {

    if (__DEV__) { console.log('🧹 Storage: All data cleared, reinitializing...'); }

  }

  // Force reinitialize
  await initializeWithSeedData();

  if (__DEV__) {

    if (__DEV__) { console.log('✅ Storage: Data cleared and reinitialized successfully!'); }

  }
};