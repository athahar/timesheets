import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';
import { simpleT } from '../i18n/simple';

interface StatusPillProps {
  status: 'paid' | 'unpaid' | 'requested' | 'active';
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
          backgroundColor: theme.color.pillPaidBg,
          textColor: theme.color.pillPaidText,
          text: simpleT('statusPill.paid')
        };
      case 'unpaid':
        return {
          backgroundColor: theme.color.pillDueBg,
          textColor: theme.color.pillDueText,
          text: simpleT('statusPill.unpaid')
        };
      case 'requested':
        return {
          backgroundColor: theme.color.pillReqBg,
          textColor: theme.color.pillReqText,
          text: simpleT('statusPill.requested')
        };
      case 'active':
        return {
          backgroundColor: theme.color.pillActiveBg,
          textColor: theme.color.pillActiveText,
          text: simpleT('statusPill.active')
        };
      default:
        return {
          backgroundColor: theme.color.textTertiary + '1A', // 10% opacity
          textColor: theme.color.textTertiary,
          text: simpleT('statusPill.unknown')
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
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {config.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: theme.radius.pill, // 10px for consistent pill design
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  pillSm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillMd: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: {
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: '600',  // semibold for pills
  },
  textSm: {
    fontSize: theme.font.small,    // 13px
  },
  textMd: {
    fontSize: theme.font.small,    // 13px for status labels
  },
});