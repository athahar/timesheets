// Conflict Resolution System for TrackPay
// Handles data conflicts between local and remote data sources

import { Client, Session, Payment, ActivityItem } from '../types';
import { DatabaseUser, DatabaseSession, DatabasePayment, DatabaseActivity } from './database.interface';

export type ConflictResolutionStrategy =
  | 'local-wins'           // Local data takes precedence
  | 'remote-wins'          // Remote data takes precedence
  | 'last-modified-wins'   // Most recently modified data wins
  | 'merge'                // Attempt to merge data intelligently
  | 'manual'               // Require manual resolution

export interface ConflictData<T> {
  id: string;
  local: T | null;
  remote: T | null;
  conflictType: 'create' | 'update' | 'delete';
  lastModifiedLocal?: string;
  lastModifiedRemote?: string;
  conflictFields?: string[];
}

export interface ConflictResolution<T> {
  action: 'use-local' | 'use-remote' | 'use-merged' | 'delete' | 'manual-required';
  data?: T;
  mergedFields?: Partial<T>;
  requiresUserInput?: boolean;
  reason?: string;
}

export class ConflictResolver {
  private static instance: ConflictResolver;

  private constructor() {}

  static getInstance(): ConflictResolver {
    if (!ConflictResolver.instance) {
      ConflictResolver.instance = new ConflictResolver();
    }
    return ConflictResolver.instance;
  }

  // Main conflict resolution entry point
  resolveConflict<T>(
    conflict: ConflictData<T>,
    strategy: ConflictResolutionStrategy = 'last-modified-wins'
  ): ConflictResolution<T> {
    console.log(`🔍 ConflictResolver: Resolving ${conflict.conflictType} conflict for ${conflict.id} using ${strategy}`);

    switch (strategy) {
      case 'local-wins':
        return this.resolveLocalWins(conflict);
      case 'remote-wins':
        return this.resolveRemoteWins(conflict);
      case 'last-modified-wins':
        return this.resolveLastModifiedWins(conflict);
      case 'merge':
        return this.resolveMerge(conflict);
      case 'manual':
        return this.resolveManual(conflict);
      default:
        console.warn(`⚠️ ConflictResolver: Unknown strategy ${strategy}, defaulting to last-modified-wins`);
        return this.resolveLastModifiedWins(conflict);
    }
  }

  // Strategy implementations
  private resolveLocalWins<T>(conflict: ConflictData<T>): ConflictResolution<T> {
    if (conflict.local) {
      return {
        action: 'use-local',
        data: conflict.local,
        reason: 'Local data prioritized'
      };
    } else if (conflict.conflictType === 'delete') {
      return {
        action: 'delete',
        reason: 'Local deletion prioritized'
      };
    } else {
      return {
        action: 'use-remote',
        data: conflict.remote || undefined,
        reason: 'No local data available'
      };
    }
  }

  private resolveRemoteWins<T>(conflict: ConflictData<T>): ConflictResolution<T> {
    if (conflict.remote) {
      return {
        action: 'use-remote',
        data: conflict.remote,
        reason: 'Remote data prioritized'
      };
    } else if (conflict.conflictType === 'delete') {
      return {
        action: 'delete',
        reason: 'Remote deletion prioritized'
      };
    } else {
      return {
        action: 'use-local',
        data: conflict.local || undefined,
        reason: 'No remote data available'
      };
    }
  }

  private resolveLastModifiedWins<T>(conflict: ConflictData<T>): ConflictResolution<T> {
    // If we have modification timestamps, use them
    if (conflict.lastModifiedLocal && conflict.lastModifiedRemote) {
      const localTime = new Date(conflict.lastModifiedLocal).getTime();
      const remoteTime = new Date(conflict.lastModifiedRemote).getTime();

      if (localTime > remoteTime) {
        return {
          action: 'use-local',
          data: conflict.local || undefined,
          reason: `Local data newer (${conflict.lastModifiedLocal} > ${conflict.lastModifiedRemote})`
        };
      } else if (remoteTime > localTime) {
        return {
          action: 'use-remote',
          data: conflict.remote || undefined,
          reason: `Remote data newer (${conflict.lastModifiedRemote} > ${conflict.lastModifiedLocal})`
        };
      }
    }

    // If no timestamps or they're equal, fallback to other logic
    if (conflict.conflictType === 'delete') {
      // Deletions are usually more recent operations
      return {
        action: 'delete',
        reason: 'Deletion operation assumed to be more recent'
      };
    }

    // Default to remote if available
    if (conflict.remote) {
      return {
        action: 'use-remote',
        data: conflict.remote,
        reason: 'Remote data available, timestamps unavailable/equal'
      };
    }

    return {
      action: 'use-local',
      data: conflict.local || undefined,
      reason: 'Local data available, no remote data'
    };
  }

  private resolveMerge<T>(conflict: ConflictData<T>): ConflictResolution<T> {
    if (!conflict.local || !conflict.remote) {
      // Can't merge if one side is missing
      return this.resolveLastModifiedWins(conflict);
    }

    // Attempt intelligent merging based on data type
    if (this.isClient(conflict.local)) {
      return this.mergeClients(conflict as ConflictData<Client>) as ConflictResolution<T>;
    } else if (this.isSession(conflict.local)) {
      return this.mergeSessions(conflict as ConflictData<Session>) as ConflictResolution<T>;
    } else if (this.isPayment(conflict.local)) {
      return this.mergePayments(conflict as ConflictData<Payment>) as ConflictResolution<T>;
    }

    // Default to last-modified-wins if we can't merge
    return this.resolveLastModifiedWins(conflict);
  }

  private resolveManual<T>(conflict: ConflictData<T>): ConflictResolution<T> {
    return {
      action: 'manual-required',
      requiresUserInput: true,
      reason: 'Manual resolution required'
    };
  }

  // Type-specific merging logic
  private mergeClients(conflict: ConflictData<Client>): ConflictResolution<Client> {
    const local = conflict.local!;
    const remote = conflict.remote!;

    // For clients, prioritize name changes and take the higher hourly rate
    const merged: Client = {
      id: local.id,
      name: this.chooseNonEmpty(local.name, remote.name) || local.name,
      hourlyRate: Math.max(local.hourlyRate, remote.hourlyRate),
    };

    const mergedFields: Partial<Client> = {};
    if (merged.name !== local.name) mergedFields.name = merged.name;
    if (merged.hourlyRate !== local.hourlyRate) mergedFields.hourlyRate = merged.hourlyRate;

    return {
      action: 'use-merged',
      data: merged,
      mergedFields,
      reason: 'Merged client data: prioritized name and max hourly rate'
    };
  }

  private mergeSessions(conflict: ConflictData<Session>): ConflictResolution<Session> {
    const local = conflict.local!;
    const remote = conflict.remote!;

    // For sessions, prioritize completed data over incomplete
    const merged: Session = {
      id: local.id,
      clientId: local.clientId,
      startTime: local.startTime, // Start time should be consistent
      endTime: remote.endTime || local.endTime, // Prefer completed session
      duration: remote.duration || local.duration,
      hourlyRate: remote.hourlyRate || local.hourlyRate,
      amount: remote.amount || local.amount,
      status: this.mergeSessionStatus(local.status, remote.status),
    };

    return {
      action: 'use-merged',
      data: merged,
      reason: 'Merged session data: prioritized completion and status progression'
    };
  }

  private mergePayments(conflict: ConflictData<Payment>): ConflictResolution<Payment> {
    const local = conflict.local!;
    const remote = conflict.remote!;

    // For payments, the most recent/complete data wins
    const merged: Payment = {
      id: local.id,
      clientId: local.clientId,
      sessionIds: [...new Set([...local.sessionIds, ...remote.sessionIds])], // Merge session IDs
      amount: remote.amount || local.amount, // Prefer remote amount
      method: remote.method || local.method, // Prefer remote method
      paidAt: new Date(Math.max(
        new Date(local.paidAt).getTime(),
        new Date(remote.paidAt).getTime()
      )), // Most recent payment date
    };

    return {
      action: 'use-merged',
      data: merged,
      reason: 'Merged payment data: combined session IDs, latest payment details'
    };
  }

  // Helper methods
  private mergeSessionStatus(localStatus: Session['status'], remoteStatus: Session['status']): Session['status'] {
    // Status progression: active -> unpaid -> requested -> paid
    const statusPriority = { active: 1, unpaid: 2, requested: 3, paid: 4 };

    const localPriority = statusPriority[localStatus] || 0;
    const remotePriority = statusPriority[remoteStatus] || 0;

    return remotePriority > localPriority ? remoteStatus : localStatus;
  }

  private chooseNonEmpty(local: string, remote: string): string | null {
    if (remote && remote.trim().length > 0) return remote;
    if (local && local.trim().length > 0) return local;
    return null;
  }

  // Type guards
  private isClient(obj: any): obj is Client {
    return obj && typeof obj.name === 'string' && typeof obj.hourlyRate === 'number';
  }

  private isSession(obj: any): obj is Session {
    return obj && obj.clientId && obj.startTime && obj.hourlyRate !== undefined;
  }

  private isPayment(obj: any): obj is Payment {
    return obj && obj.clientId && obj.amount && obj.method && obj.paidAt;
  }

  // Batch conflict resolution
  async resolveBatchConflicts<T>(
    conflicts: ConflictData<T>[],
    strategy: ConflictResolutionStrategy = 'last-modified-wins'
  ): Promise<ConflictResolution<T>[]> {
    console.log(`🔍 ConflictResolver: Resolving ${conflicts.length} conflicts using ${strategy}`);

    const resolutions = conflicts.map(conflict =>
      this.resolveConflict(conflict, strategy)
    );

    const manualCount = resolutions.filter(r => r.requiresUserInput).length;
    if (manualCount > 0) {
      console.warn(`⚠️ ConflictResolver: ${manualCount} conflicts require manual resolution`);
    }

    return resolutions;
  }

  // Conflict detection helpers
  detectConflicts<T>(localData: T[], remoteData: T[], getId: (item: T) => string): ConflictData<T>[] {
    const conflicts: ConflictData<T>[] = [];
    const localMap = new Map(localData.map(item => [getId(item), item]));
    const remoteMap = new Map(remoteData.map(item => [getId(item), item]));

    // Find all unique IDs
    const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

    for (const id of allIds) {
      const local = localMap.get(id);
      const remote = remoteMap.get(id);

      // Skip if data is identical
      if (local && remote && this.isDataEqual(local, remote)) {
        continue;
      }

      if (local && remote) {
        // Both exist - update conflict
        conflicts.push({
          id,
          local,
          remote,
          conflictType: 'update',
          conflictFields: this.findDifferentFields(local, remote),
        });
      } else if (local && !remote) {
        // Local only - potential delete conflict
        conflicts.push({
          id,
          local,
          remote: null,
          conflictType: 'delete',
        });
      } else if (!local && remote) {
        // Remote only - create conflict
        conflicts.push({
          id,
          local: null,
          remote,
          conflictType: 'create',
        });
      }
    }

    return conflicts;
  }

  private isDataEqual<T>(obj1: T, obj2: T): boolean {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

  private findDifferentFields<T>(obj1: T, obj2: T): string[] {
    const fields: string[] = [];
    const keys = new Set([...Object.keys(obj1 as any), ...Object.keys(obj2 as any)]);

    for (const key of keys) {
      if ((obj1 as any)[key] !== (obj2 as any)[key]) {
        fields.push(key);
      }
    }

    return fields;
  }
}

// Export singleton instance
export const conflictResolver = ConflictResolver.getInstance();
export default conflictResolver;