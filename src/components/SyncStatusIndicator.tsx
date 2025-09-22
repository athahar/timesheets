// Sync Status Indicator Component for TrackPay
// Shows real-time sync status and connection state

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { getSyncStatus, addSyncStatusListener, forcSync, retryFailedOperations } from '../services/storageService';
import { SyncStatus } from '../services/syncQueue';

interface SyncStatusIndicatorProps {
  style?: any;
  showDetails?: boolean;
  onPress?: () => void;
  compact?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  style,
  showDetails = false,
  onPress,
  compact = false,
}) => {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    lastSync: null,
    pendingOperations: 0,
    failedOperations: 0,
    lastError: null,
  });

  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Initial status
    getSyncStatus().then(setStatus);

    // Subscribe to status updates
    const unsubscribe = addSyncStatusListener(setStatus);

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Animate when syncing
    if (status.isSyncing) {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (status.isSyncing) {
            pulse();
          }
        });
      };
      pulse();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [status.isSyncing, fadeAnim]);

  const getStatusInfo = () => {
    if (!status.isOnline) {
      return {
        icon: '📴',
        text: 'Offline',
        color: '#FF6B6B',
        bgColor: '#FFE8E8',
      };
    }

    if (status.isSyncing) {
      return {
        icon: '🔄',
        text: 'Syncing...',
        color: '#4ECDC4',
        bgColor: '#E8FFFE',
      };
    }

    if (status.failedOperations > 0) {
      return {
        icon: '⚠️',
        text: `${status.failedOperations} failed`,
        color: '#FF9500',
        bgColor: '#FFF3E0',
      };
    }

    if (status.pendingOperations > 0) {
      return {
        icon: '⏳',
        text: `${status.pendingOperations} pending`,
        color: '#FF9500',
        bgColor: '#FFF3E0',
      };
    }

    return {
      icon: '✅',
      text: 'Synced',
      color: '#4CAF50',
      bgColor: '#E8F5E8',
    };
  };

  const statusInfo = getStatusInfo();

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Never';

    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (status.failedOperations > 0) {
      // Retry failed operations
      retryFailedOperations();
    } else if (status.pendingOperations > 0 && status.isOnline) {
      // Force sync
      forcSync();
    }
  };

  const renderCompact = () => (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12,
          backgroundColor: statusInfo.bgColor,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 12 }}>{statusInfo.icon}</Text>
      {(status.pendingOperations > 0 || status.failedOperations > 0) && (
        <Text
          style={{
            fontSize: 10,
            color: statusInfo.color,
            fontWeight: '600',
            marginLeft: 4,
          }}
        >
          {status.pendingOperations + status.failedOperations}
        </Text>
      )}
    </Animated.View>
  );

  const renderFull = () => (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 8,
          backgroundColor: statusInfo.bgColor,
          borderWidth: 1,
          borderColor: statusInfo.color + '20',
        },
        style,
      ]}
      disabled={!onPress && status.pendingOperations === 0 && status.failedOperations === 0}
    >
      <Animated.Text
        style={{
          opacity: fadeAnim,
          fontSize: 16,
          marginRight: 8,
        }}
      >
        {statusInfo.icon}
      </Animated.Text>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: statusInfo.color,
          }}
        >
          {statusInfo.text}
        </Text>

        {showDetails && (
          <Text
            style={{
              fontSize: 12,
              color: '#666',
              marginTop: 2,
            }}
          >
            Last sync: {formatLastSync(status.lastSync)}
          </Text>
        )}

        {status.lastError && (
          <Text
            style={{
              fontSize: 11,
              color: '#FF6B6B',
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {status.lastError}
          </Text>
        )}
      </View>

      {(status.pendingOperations > 0 || status.failedOperations > 0) && (
        <View
          style={{
            backgroundColor: statusInfo.color,
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: 8,
          }}
        >
          <Text
            style={{
              color: 'white',
              fontSize: 12,
              fontWeight: '600',
            }}
          >
            {status.pendingOperations + status.failedOperations}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return compact ? renderCompact() : renderFull();
};

// Sync Status Header Component - for navigation headers
export const SyncStatusHeader: React.FC = () => {
  return (
    <SyncStatusIndicator
      compact
      style={{
        marginRight: 8,
      }}
    />
  );
};

// Sync Status Banner Component - for prominent display
export const SyncStatusBanner: React.FC<{
  onDismiss?: () => void;
}> = ({ onDismiss }) => {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    lastSync: null,
    pendingOperations: 0,
    failedOperations: 0,
    lastError: null,
  });

  useEffect(() => {
    // Direct Supabase - no sync queue, just set idle status
    setStatus(getSyncStatus());
    const unsubscribe = addSyncStatusListener(setStatus);
    return unsubscribe;
  }, []);

  // Only show banner for important states
  if (status.isOnline && status.pendingOperations === 0 && status.failedOperations === 0) {
    return null;
  }

  const getBannerInfo = () => {
    if (!status.isOnline && status.pendingOperations > 0) {
      return {
        icon: '📴',
        title: 'Working Offline',
        message: `${status.pendingOperations} changes will sync when online`,
        color: '#FF9500',
        bgColor: '#FFF3E0',
      };
    }

    if (status.failedOperations > 0) {
      return {
        icon: '⚠️',
        title: 'Sync Issues',
        message: `${status.failedOperations} operations failed. Tap to retry.`,
        color: '#FF6B6B',
        bgColor: '#FFE8E8',
      };
    }

    return null;
  };

  const bannerInfo = getBannerInfo();
  if (!bannerInfo) return null;

  return (
    <TouchableOpacity
      onPress={() => {
        if (status.failedOperations > 0) {
          retryFailedOperations();
        }
        onDismiss?.();
      }}
      style={{
        backgroundColor: bannerInfo.bgColor,
        borderLeftWidth: 4,
        borderLeftColor: bannerInfo.color,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 20, marginRight: 12 }}>
        {bannerInfo.icon}
      </Text>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: bannerInfo.color,
            marginBottom: 2,
          }}
        >
          {bannerInfo.title}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: '#666',
          }}
        >
          {bannerInfo.message}
        </Text>
      </View>

      {onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          style={{
            padding: 4,
            marginLeft: 8,
          }}
        >
          <Text style={{ fontSize: 18, color: '#999' }}>×</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export default SyncStatusIndicator;