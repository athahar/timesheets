import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TPStatusPill } from './TPStatusPill';
import { TP } from '../../styles/themeV2';
import { formatCurrency } from '../../utils/formatters';

export interface TPTimelineItemProps {
  type: 'session' | 'payment_request' | 'payment';
  title: string;
  metadata: string;
  amount?: number;
  status?: 'active' | 'complete' | 'requested';
  icon?: 'clock' | 'money' | 'send';
  onPress?: () => void;
}

/**
 * TPTimelineItem - Activity Feed Entry Component
 *
 * Features:
 * - Icon (clock, money, send)
 * - Title + metadata
 * - Right-aligned amount/status
 * - Optional touchable
 *
 * @example
 * <TPTimelineItem
 *   type="session"
 *   title="Work Session"
 *   metadata="Complete • 4 hours • 1 person"
 *   amount={100.50}
 *   icon="clock"
 * />
 */
export const TPTimelineItem: React.FC<TPTimelineItemProps> = ({
  type,
  title,
  metadata,
  amount,
  status,
  icon = 'clock',
  onPress,
}) => {
  const getIconName = (): any => {
    if (icon === 'clock') return 'clock';
    if (icon === 'money') return 'dollar-sign';
    if (icon === 'send') return 'send';
    return 'clock';
  };

  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

  return (
    <Container style={styles.container} {...containerProps}>
      <Feather
        name={getIconName()}
        size={20}
        color={TP.color.textSecondary}
        style={styles.icon}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {amount !== undefined && (
            <Text style={styles.amount}>{formatCurrency(amount)}</Text>
          )}
          {status && !amount && (
            <TPStatusPill status={status as any} />
          )}
        </View>
        <Text style={styles.metadata}>{metadata}</Text>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: TP.spacing.x16,
    paddingHorizontal: TP.spacing.x16,
  },
  icon: {
    marginTop: 2,
  },
  content: {
    flex: 1,
    marginLeft: TP.spacing.x12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
    flex: 1,
  },
  amount: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.bold,
    color: TP.color.ink,
  },
  metadata: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.medium,
    color: TP.color.textSecondary,
    marginTop: 4,
  },
});
