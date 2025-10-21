import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { TP } from '../../styles/themeV2';
import { PillStyles } from '../../styles/components';

export interface TPStatusPillProps {
  status: 'paid' | 'due' | 'requested' | 'active';
  customText?: string;
  style?: ViewStyle;
}

/**
 * TPStatusPill - TrackPay v2 Status Badge Component
 *
 * Unified status badge for payment/session states
 *
 * Variants:
 * - paid: Green background (payment completed)
 * - due: Amber background (unpaid balance)
 * - requested: Purple background (payment request sent)
 * - active: Teal background (session in progress)
 *
 * @example
 * <TPStatusPill status="due" />
 * <TPStatusPill status="paid" customText="Fully Paid" />
 */
export const TPStatusPill: React.FC<TPStatusPillProps> = ({
  status,
  customText,
  style,
}) => {
  const getDefaultText = (): string => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'due':
        return 'Due';
      case 'requested':
        return 'Requested';
      case 'active':
        return 'Active';
      default:
        return '';
    }
  };

  const getPillStyles = (): ViewStyle[] => {
    const styles: ViewStyle[] = [PillStyles.base];

    if (status === 'paid') {
      styles.push(PillStyles.paid);
    } else if (status === 'due') {
      styles.push(PillStyles.due);
    } else if (status === 'requested') {
      styles.push(PillStyles.requested);
    } else if (status === 'active') {
      styles.push(PillStyles.active);
    }

    if (style) {
      styles.push(style);
    }

    return styles;
  };

  const getTextStyle = () => {
    const baseStyle = [PillStyles.text];

    if (status === 'paid') {
      baseStyle.push(PillStyles.paidText);
    } else if (status === 'due') {
      baseStyle.push(PillStyles.dueText);
    } else if (status === 'requested') {
      baseStyle.push(PillStyles.requestedText);
    } else if (status === 'active') {
      baseStyle.push(PillStyles.activeText);
    }

    return baseStyle;
  };

  const displayText = customText || getDefaultText();

  return (
    <View style={getPillStyles()}>
      <Text style={getTextStyle()}>{displayText}</Text>
    </View>
  );
};
