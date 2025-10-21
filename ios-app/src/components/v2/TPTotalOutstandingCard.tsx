import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TPCard } from './TPCard';
import { TPButton } from './TPButton';
import { TP } from '../../styles/themeV2';
import { CardStyles } from '../../styles/components';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/formatters';

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
  const { t } = useTranslation();

  return (
    <TPCard padding="lg">
      <Text style={CardStyles.label}>{t('totalOutstanding')}</Text>
      <Text style={CardStyles.amount}>{formatCurrency(amount)}</Text>
      <Text style={CardStyles.meta}>
        {t('hoursUnpaid', { count: hours.toFixed(1) })}
      </Text>

      {showRequestButton && onRequestPayment && (
        <TPButton
          title={t('requestPayment')}
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
