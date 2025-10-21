import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TPCard } from './TPCard';
import { TPButton } from './TPButton';
import { TP } from '../../styles/themeV2';
import { CardStyles } from '../../styles/components';
import { simpleT } from '../../i18n/simple';
import { formatCurrency, formatHours } from '../../utils/formatters';

export interface TPTotalOutstandingCardProps {
  amount: number;
  hours: number;
  showRequestButton?: boolean;
  onRequestPayment?: () => void;
  loading?: boolean;
}

/**
 * TPTotalOutstandingCard - Hero Balance Card
 *
 * Features:
 * - Large money display (34px bold)
 * - Hours subtitle
 * - Optional "Request Payment" button
 * - Loading state
 *
 * @example
 * <TPTotalOutstandingCard amount={879} hours={29.3} showRequestButton onRequestPayment={handleRequest} />
 */
export const TPTotalOutstandingCard: React.FC<TPTotalOutstandingCardProps> = ({
  amount,
  hours,
  showRequestButton = false,
  onRequestPayment,
  loading = false,
}) => {
  return (
    <TPCard padding="lg">
      <Text style={CardStyles.label}>{simpleT('common.totalOutstanding')}</Text>
      <Text style={CardStyles.amount}>{formatCurrency(amount)}</Text>
      {amount > 0 && (
        <Text style={CardStyles.meta}>
          {formatHours(hours)}
        </Text>
      )}

      {showRequestButton && onRequestPayment && (
        <TPButton
          title={simpleT('common.requestPayment')}
          variant="primary"
          icon="send"
          onPress={onRequestPayment}
          loading={loading}
          style={styles.button}
          fullWidth
        />
      )}
    </TPCard>
  );
};

const styles = StyleSheet.create({
  button: {
    marginTop: TP.spacing.x16,
  },
});
