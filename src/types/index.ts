export interface Client {
  id: string;
  name: string;
  email?: string; // Optional for backward compatibility
  hourlyRate: number;
  claimedStatus?: 'claimed' | 'unclaimed'; // Whether client has claimed their account
  inviteCode?: string; // Included when creating new client
}

export interface Session {
  id: string;
  clientId: string;
  providerId?: string;
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

export interface Invite {
  id: string;
  providerId: string;
  clientId: string; // ID of the client this invite is for
  inviteCode: string; // 8-character unique code (e.g., "ABC12XYZ")
  clientName: string;
  hourlyRate: number;
  status: 'pending' | 'claimed' | 'expired';
  claimedBy?: string; // User ID who claimed the invite
  createdAt: Date;
  expiresAt: Date;
  claimedAt?: Date;
  // Dynamic invite metadata (for future bidirectional invites)
  inviterRole?: 'provider' | 'client';
  inviteeName?: string;
  inviteeRole?: 'provider' | 'client';
}

export type PaymentMethod = 'cash' | 'zelle' | 'paypal' | 'bank_transfer' | 'other';
export type InviteStatus = 'pending' | 'claimed' | 'expired';