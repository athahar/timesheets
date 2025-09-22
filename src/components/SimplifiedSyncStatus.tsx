// Simplified Sync Status - Direct Supabase Implementation
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SimplifiedSyncStatusProps {
  visible?: boolean;
  onDismiss?: () => void;
}

export const SimplifiedSyncStatus: React.FC<SimplifiedSyncStatusProps> = ({ visible = true }) => {
  // With direct Supabase, we don't need sync status
  // Everything saves directly to the database

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        🟢 Connected to Supabase - Direct saving enabled
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e8f5e8',
    padding: 8,
    margin: 8,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#4ade80',
  },
  text: {
    color: '#166534',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default SimplifiedSyncStatus;