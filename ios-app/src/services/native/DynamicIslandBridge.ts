import { NativeModules, Platform } from 'react-native';
import { capture } from '../analytics/posthog';

const { TrackPayActivityKitModule } = NativeModules;

interface ActivityKitModule {
  startActivity(
    sessionId: string,
    clientId: string,
    clientName: string,
    startTimeMs: number
  ): Promise<{ success: boolean; activityId: string }>;

  endActivity(sessionId: string): Promise<{ success: boolean }>;

  getActiveActivities(): Promise<Array<{
    sessionId: string;
    clientId: string;
    clientName: string;
    startTime: number;  // milliseconds
  }>>;
}

const nativeModule: ActivityKitModule | null =
  Platform.OS === 'ios' && TrackPayActivityKitModule
    ? TrackPayActivityKitModule
    : null;

// Debug logging
if (__DEV__) {
  console.log('[DynamicIsland] Native module available:', !!nativeModule);
  console.log('[DynamicIsland] Platform:', Platform.OS);
  console.log('[DynamicIsland] iOS Version:', Platform.Version);
  console.log('[DynamicIsland] TrackPayActivityKitModule exists:', !!TrackPayActivityKitModule);
  console.log('[DynamicIsland] All NativeModules:', Object.keys(NativeModules).sort());
}

/**
 * Check if Dynamic Island is supported on this device
 * Requires iOS 16.4+ and ActivityKit module availability
 */
export function isDynamicIslandSupported(): boolean {
  if (Platform.OS !== 'ios') return false;
  if (!nativeModule) return false;

  // iOS 16.4+ required
  const iosVersion = parseFloat(Platform.Version as string);
  return iosVersion >= 16.4;
}

/**
 * Check if feature is enabled via environment variable
 */
export function isDynamicIslandEnabled(): boolean {
  return process.env.EXPO_PUBLIC_DYNAMIC_ISLAND_ENABLED === 'true';
}

/**
 * Start a Dynamic Island activity for an active session
 *
 * @param sessionId - Session UUID
 * @param clientId - Client UUID (for deep linking)
 * @param clientName - Client display name
 * @param startTime - Session start time
 * @returns true on success, false on failure
 */
export async function startDynamicIslandActivity(
  sessionId: string,
  clientId: string,
  clientName: string,
  startTime: Date
): Promise<boolean> {
  // Check feature flag
  if (!isDynamicIslandEnabled()) {
    if (__DEV__) {
      console.log('[DynamicIsland] Feature disabled via env flag');
    }
    return false;
  }

  // Check module availability
  if (!nativeModule) {
    if (__DEV__) {
      console.log('[DynamicIsland] Module not available, skipping');
    }
    return false;
  }

  try {
    const startTimeMs = startTime.getTime();
    const result = await nativeModule.startActivity(
      sessionId,
      clientId,
      clientName,
      startTimeMs
    );

    if (__DEV__) {
      console.log('[DynamicIsland] Activity started:', result);
    }

    // Analytics
    capture('dynamic_island_started', {
      session_id: sessionId,
      client_id: clientId,
      start_time: startTime.toISOString(),
    });

    return true;
  } catch (error: any) {
    if (__DEV__) {
      console.error('[DynamicIsland] Failed to start activity:', error);
    }

    // Analytics - silent failure
    capture('dynamic_island_failed', {
      session_id: sessionId,
      client_id: clientId,
      error_code: error.code || 'UNKNOWN',
      error_message: error.message || String(error),
      operation: 'start',
    });

    return false;
  }
}

/**
 * End a Dynamic Island activity
 *
 * @param sessionId - Session UUID
 * @returns true on success, false on failure
 */
export async function endDynamicIslandActivity(sessionId: string): Promise<boolean> {
  if (!nativeModule) return false;

  try {
    await nativeModule.endActivity(sessionId);

    if (__DEV__) {
      console.log('[DynamicIsland] Activity ended:', sessionId);
    }

    return true;
  } catch (error: any) {
    if (__DEV__) {
      console.error('[DynamicIsland] Failed to end activity:', error);
    }

    capture('dynamic_island_failed', {
      session_id: sessionId,
      error_code: error.code || 'UNKNOWN',
      error_message: error.message || String(error),
      operation: 'end',
    });

    return false;
  }
}

/**
 * Get all active Dynamic Island activities
 * Used for state sync on app relaunch
 *
 * @returns Array of active activities
 */
export async function getActiveActivities(): Promise<Array<{
  sessionId: string;
  clientId: string;
  clientName: string;
  startTime: Date;
}>> {
  if (!nativeModule) return [];

  try {
    const activities = await nativeModule.getActiveActivities();

    return activities.map(a => ({
      ...a,
      startTime: new Date(a.startTime),
    }));
  } catch (error) {
    if (__DEV__) {
      console.error('[DynamicIsland] Failed to get activities:', error);
    }
    return [];
  }
}
