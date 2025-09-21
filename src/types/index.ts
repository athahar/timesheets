export interface Client {
  id: string;
  name: string;
  hourlyRate: number;
}

export interface Session {
  id: string;
  clientId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in hours
  hourlyRate: number; // snapshot at time of session
  amount?: number; // duration × hourlyRate
  status: 'active' | 'unpaid' | 'requested' | 'paid';
}

export interface Payment {
  id: string;
  clientId: string;
  sessionIds: string[]; // array of session IDs included in payment
  amount: number;
  method: 'cash' | 'zelle' | 'paypal' | 'bank_transfer' | 'other';
  paidAt: Date;
}

export interface ActivityItem {
  id: string;
  type: 'session_start' | 'session_end' | 'payment_request' | 'payment_completed';
  clientId: string;
  timestamp: Date;
  data: any; // flexible data for different activity types
}

export type PaymentMethod = 'cash' | 'zelle' | 'paypal' | 'bank_transfer' | 'other';