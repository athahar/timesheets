import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

interface StatusPillProps {
  status: 'paid' | 'unpaid' | 'requested';
  size?: 'sm' | 'md';
  style?: any;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  size = 'md',
  style,
}) => {
  console.log('🎨 StatusPill: Rendering with status:', status);

  // Simplified version to avoid theme issues
  const getSimpleConfig = () => {
    switch (status) {
      case 'paid':
        return { backgroundColor: '#E5F9EB', textColor: '#34C759', text: 'Paid' };
      case 'unpaid':
        return { backgroundColor: '#FEF3E2', textColor: '#FF9500', text: 'Unpaid' };
      case 'requested':
        return { backgroundColor: '#EBF5FF', textColor: '#007AFF', text: 'Requested' };
      default:
        return { backgroundColor: '#f0f0f0', textColor: '#666', text: 'Unknown' };
    }
  };

  const config = getSimpleConfig();

  return (
    <View
      style={[
        {
          backgroundColor: config.backgroundColor,
          borderRadius: 999,
          paddingHorizontal: size === 'sm' ? 8 : 16,
          paddingVertical: size === 'sm' ? 4 : 8,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text
        style={{
          color: config.textColor,
          fontSize: size === 'sm' ? 12 : 14,
          fontWeight: '600',
        }}
      >
        {config.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: theme.borderRadius.button, // rounded-full
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  pillSm: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  pillMd: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  text: {
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  textSm: {
    fontSize: theme.fontSize.small,
  },
  textMd: {
    fontSize: theme.fontSize.footnote,
  },
});