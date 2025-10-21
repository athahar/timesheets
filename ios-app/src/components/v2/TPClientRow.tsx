import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TPAvatar } from './TPAvatar';
import { TPStatusPill } from './TPStatusPill';
import { TP } from '../../styles/themeV2';
import { formatCurrency } from '../../utils/formatters';
import { useTranslation } from 'react-i18next';

export interface TPClientRowProps {
  client: {
    id: string;
    name: string;
    imageUri?: string;
    rate?: number;
    balance: number;
    hours: number;
    status: 'paid' | 'due' | 'requested';
  };
  onPress: () => void;
  showDivider?: boolean;
}

/**
 * TPClientRow - Client List Item Component
 *
 * Features:
 * - Avatar (image or initials)
 * - Client name + hourly rate
 * - Balance amount + hours
 * - Status pill (Paid/Due/Requested)
 * - Optional divider
 *
 * @example
 * <TPClientRow client={client} onPress={() => navigate('ClientView', { clientId })} showDivider />
 */
export const TPClientRow: React.FC<TPClientRowProps> = ({
  client,
  onPress,
  showDivider = false,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <TouchableOpacity
        onPress={onPress}
        style={styles.container}
        activeOpacity={0.7}
      >
        <TPAvatar name={client.name} imageUri={client.imageUri} size="md" />

        <View style={styles.content}>
          <Text style={styles.name}>{client.name}</Text>
          <Text style={styles.meta}>
            {t('common.due')}: {formatCurrency(client.balance)} ({client.hours} {t('common.hrs')})
          </Text>
        </View>

        <TPStatusPill status={client.status} />
      </TouchableOpacity>

      {showDivider && <View style={styles.divider} />}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: TP.spacing.x16,
    paddingHorizontal: TP.spacing.x16,
    minHeight: 72,
  },
  content: {
    flex: 1,
    marginLeft: TP.spacing.x12,
  },
  name: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
  },
  meta: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.medium,
    color: TP.color.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: TP.color.divider,
    marginLeft: 68, // Avatar (40) + left padding (16) + margin (12)
  },
});
