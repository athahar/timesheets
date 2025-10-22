/**
 * Analytics Global Properties Context
 *
 * Provides global properties that are attached to EVERY analytics event:
 * - user_id, user_role
 * - app_version, build_number
 * - platform, os_version, device_model
 * - language, timezone
 * - session_id (app session, not work session)
 * - storage_mode
 *
 * @see /docs/analytics/POSTHOG_IMPLEMENTATION_PLAN.md
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';

// ============================================
// TYPES
// ============================================

export type GlobalProperties = {
  user_id?: string;
  user_role?: 'provider' | 'client' | 'guest';
  app_version: string;
  build_number: number;
  platform: 'ios' | 'android' | 'web';
  os_version: string;
  device_model: string;
  language: string;
  timezone: string;
  session_id: string;
  storage_mode: 'local_only' | 'cloud_synced';
};

type AnalyticsContextType = {
  globals: GlobalProperties;
  setUserId: (userId: string | undefined) => void;
  setUserRole: (role: 'provider' | 'client' | 'guest' | undefined) => void;
  setStorageMode: (mode: 'local_only' | 'cloud_synced') => void;
  clearGlobalContext: () => void;
};

// ============================================
// CONTEXT
// ============================================

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getAppVersion(): string {
  return Constants.expoConfig?.version || '1.0.0';
}

function getBuildNumber(): number {
  const buildNumber = Constants.expoConfig?.ios?.buildNumber;
  return buildNumber ? parseInt(buildNumber, 10) : 1;
}

function getPlatform(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

function getOSVersion(): string {
  return Platform.Version?.toString() || 'unknown';
}

function getDeviceModel(): string {
  return Device.modelName || Device.deviceName || 'unknown';
}

function getLanguage(): string {
  return Localization.locale || 'en-US';
}

function getTimezone(): string {
  return Localization.timezone || 'UTC';
}

// ============================================
// PROVIDER COMPONENT
// ============================================

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [globals, setGlobals] = useState<GlobalProperties>({
    user_id: undefined,
    user_role: 'guest',
    app_version: getAppVersion(),
    build_number: getBuildNumber(),
    platform: getPlatform(),
    os_version: getOSVersion(),
    device_model: getDeviceModel(),
    language: getLanguage(),
    timezone: getTimezone(),
    session_id: generateSessionId(),
    storage_mode: 'local_only',
  });

  // Keep cache in sync with globals state
  useEffect(() => {
    updateGlobalPropertiesCache(globals);
  }, [globals]);

  const setUserId = (userId: string | undefined) => {
    setGlobals(prev => ({ ...prev, user_id: userId }));
  };

  const setUserRole = (role: 'provider' | 'client' | 'guest' | undefined) => {
    setGlobals(prev => ({ ...prev, user_role: role || 'guest' }));
  };

  const setStorageMode = (mode: 'local_only' | 'cloud_synced') => {
    setGlobals(prev => ({ ...prev, storage_mode: mode }));
  };

  const clearGlobalContext = () => {
    setGlobals(prev => ({
      ...prev,
      user_id: undefined,
      user_role: 'guest',
      session_id: generateSessionId(), // New session after logout
    }));
  };

  const value: AnalyticsContextType = {
    globals,
    setUserId,
    setUserRole,
    setStorageMode,
    clearGlobalContext,
  };

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to access analytics context
 * @example
 * const { setUserId, setUserRole } = useAnalytics();
 */
export function useAnalytics(): AnalyticsContextType {
  const context = useContext(AnalyticsContext);

  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider');
  }

  return context;
}

/**
 * Get current global properties snapshot
 * This is used by the capture() wrapper to merge globals with event payloads
 */
export function getGlobals(): GlobalProperties {
  // This is a fallback for when we can't use React hooks
  // In practice, we'll use the context value in most cases
  return {
    user_id: undefined,
    user_role: 'guest',
    app_version: getAppVersion(),
    build_number: getBuildNumber(),
    platform: getPlatform(),
    os_version: getOSVersion(),
    device_model: getDeviceModel(),
    language: getLanguage(),
    timezone: getTimezone(),
    session_id: '', // Will be set by provider
    storage_mode: 'local_only',
  };
}

// We'll need a way to access the globals from outside React components
// This will be set by the provider and accessed by posthog.ts
let globalPropertiesCache: GlobalProperties = getGlobals();

/**
 * Internal: Update cached global properties
 * Called by AnalyticsProvider to keep cache in sync
 */
export function updateGlobalPropertiesCache(props: GlobalProperties): void {
  globalPropertiesCache = { ...props };
}

/**
 * Internal: Get cached global properties
 * Used by posthog.ts capture() to merge globals
 */
export function getCachedGlobals(): GlobalProperties {
  return { ...globalPropertiesCache };
}

/**
 * Internal: Clear global properties cache (logout)
 */
export function clearGlobalPropertiesCache(): void {
  globalPropertiesCache = {
    ...globalPropertiesCache,
    user_id: undefined,
    user_role: 'guest',
    session_id: generateSessionId(),
  };
}
