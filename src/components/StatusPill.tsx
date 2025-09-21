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
  const getStatusConfig = () => {
    switch (status) {
      case 'paid':
        return {
          backgroundColor: theme.colors.status.paid.background,
          borderColor: theme.colors.status.paid.border,
          textColor: theme.colors.status.paid.text,
          text: 'Paid'
        };
      case 'unpaid':
        return {
          backgroundColor: theme.colors.status.unpaid.background,
          borderColor: theme.colors.status.unpaid.border,
          textColor: theme.colors.status.unpaid.text,
          text: 'Unpaid'
        };
      case 'requested':
        return {
          backgroundColor: theme.colors.status.requested.background,
          borderColor: theme.colors.status.requested.border,
          textColor: theme.colors.status.requested.text,
          text: 'Requested'
        };
      default:
        return {
          backgroundColor: theme.colors.text.tertiary + '1A', // 10% opacity
          borderColor: theme.colors.text.tertiary + '33',     // 20% opacity
          textColor: theme.colors.text.tertiary,
          text: 'Unknown'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View
      style={[
        styles.pill,
        size === 'sm' ? styles.pillSm : styles.pillMd,
        {
          backgroundColor: config.backgroundColor,
          borderWidth: 1,
          borderColor: config.borderColor,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'sm' ? styles.textSm : styles.textMd,
          { color: config.textColor }
        ]}
      >
        {config.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: theme.borderRadius.small, // 6px for status pills
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  pillSm: {
    paddingHorizontal: theme.spacing.xs,  // 8px
    paddingVertical: theme.spacing.xxs,   // 4px
  },
  pillMd: {
    paddingHorizontal: theme.spacing.sm,  // 12px
    paddingVertical: theme.spacing.xxs,   // 4px
  },
  text: {
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: theme.fontWeight.medium,  // 500 weight for interactive elements
  },
  textSm: {
    fontSize: theme.fontSize.footnote,    // 13px
  },
  textMd: {
    fontSize: theme.fontSize.footnote,    // 13px for status labels
  },
});