// TrackPay v2 Component StyleSheets
// Reusable style helpers to reduce duplication across components

import { StyleSheet } from 'react-native';
import { TP } from './themeV2';

/**
 * CardStyles - For TPCard and card-based components
 */
export const CardStyles = StyleSheet.create({
  base: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.card,
    padding: 24,
    // Platform shadow (iOS)
    // @ts-ignore - TypeScript doesn't recognize platform-specific spread
    ...TP.shadow.card.ios,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: TP.color.textSecondary,
    marginBottom: 8
  },
  amount: {
    fontSize: 34,
    fontWeight: '700',
    color: TP.color.ink,
    letterSpacing: -0.2
  },
  meta: {
    fontSize: 13,
    fontWeight: '500',
    color: TP.color.textSecondary
  },
});

/**
 * ButtonStyles - For TPButton and button-based components
 */
export const ButtonStyles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: TP.radius.button,
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Primary variant
  primary: {
    backgroundColor: TP.color.btn.primaryBg
  },
  primaryText: {
    color: TP.color.btn.primaryText,
    fontSize: 17,
    fontWeight: '600'
  },

  // Secondary variant
  secondary: {
    backgroundColor: TP.color.btn.secondaryBg,
    borderWidth: 1,
    borderColor: TP.color.btn.secondaryBorder
  },
  secondaryText: {
    color: TP.color.btn.secondaryText,
    fontSize: 17,
    fontWeight: '600'
  },

  // Danger variant
  danger: {
    backgroundColor: TP.color.btn.dangerBg
  },
  dangerText: {
    color: TP.color.btn.dangerText,
    fontSize: 17,
    fontWeight: '600'
  },

  // Disabled state
  disabled: {
    backgroundColor: TP.color.btn.disabledBg,
    borderColor: TP.color.btn.disabledBorder
  },
  disabledText: {
    color: TP.color.btn.disabledText
  },
});

/**
 * PillStyles - For TPStatusPill and badge components
 */
export const PillStyles = StyleSheet.create({
  base: {
    borderRadius: TP.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start'
  },
  text: {
    fontSize: 13,
    fontWeight: '600'
  },

  // Paid variant
  paid: {
    backgroundColor: TP.color.pill.paidBg
  },
  paidText: {
    color: TP.color.pill.paidText
  },

  // Due variant
  due: {
    backgroundColor: TP.color.pill.dueBg
  },
  dueText: {
    color: TP.color.pill.dueText
  },

  // Requested variant
  requested: {
    backgroundColor: TP.color.pill.requestedBg
  },
  requestedText: {
    color: TP.color.pill.requestedText
  },

  // Active variant
  active: {
    backgroundColor: TP.color.pill.activeBg
  },
  activeText: {
    color: TP.color.pill.activeText
  },
});
