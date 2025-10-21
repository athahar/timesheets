// TrackPay v2 Component StyleSheets
// Reusable style helpers to reduce duplication across components
// Black primary buttons, semantic status pills

import { StyleSheet, Platform } from 'react-native';
import { TP } from './themeV2';

/**
 * CardStyles - For TPCard and card-based components
 */
export const CardStyles = StyleSheet.create({
  base: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.card,
    padding: 24,
    borderWidth: 1,
    borderColor: TP.color.border,
    ...(Platform.OS === 'android' ? TP.shadow.card.android : TP.shadow.card.ios),
  },
  label:  { fontSize: 13, fontWeight: '600', color: TP.color.textSecondary, marginBottom: 8 },
  amount: { fontSize: 34, fontWeight: '700', color: TP.color.ink, letterSpacing: -0.2 },
  meta:   { fontSize: 13, fontWeight: '500', color: TP.color.textSecondary },
});

/**
 * ButtonStyles - For TPButton and button-based components
 */
export const ButtonStyles = StyleSheet.create({
  base: { height: 52, borderRadius: TP.radius.button, alignItems: 'center', justifyContent: 'center' },

  primary: { backgroundColor: TP.color.btn.primaryBg },
  primaryText: { color: TP.color.btn.primaryText, fontSize: 17, fontWeight: '600' },

  secondary: { backgroundColor: TP.color.btn.secondaryBg, borderWidth: 1, borderColor: TP.color.btn.secondaryBorder },
  secondaryText: { color: TP.color.btn.secondaryText, fontSize: 17, fontWeight: '600' },

  danger: { backgroundColor: TP.color.btn.dangerBg },
  dangerText: { color: TP.color.btn.dangerText, fontSize: 17, fontWeight: '600' },

  disabled: { backgroundColor: TP.color.btn.disabledBg, borderColor: TP.color.btn.disabledBorder },
  disabledText: { color: TP.color.btn.disabledText },
});

/**
 * PillStyles - For TPStatusPill and badge components
 * Semantic colors only - not used for branding
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

  // Paid variant (green - semantic)
  paid: {
    backgroundColor: TP.color.pill.paidBg
  },
  paidText: {
    fontSize: 13,
    fontWeight: '600',
    color: TP.color.pill.paidText
  },

  // Due variant (amber - semantic)
  due: {
    backgroundColor: TP.color.pill.dueBg
  },
  dueText: {
    fontSize: 13,
    fontWeight: '600',
    color: TP.color.pill.dueText
  },

  // Requested variant (purple - semantic)
  requested: {
    backgroundColor: TP.color.pill.requestedBg
  },
  requestedText: {
    fontSize: 13,
    fontWeight: '600',
    color: TP.color.pill.requestedText
  },

  // Active variant (teal - semantic)
  active: {
    backgroundColor: TP.color.pill.activeBg
  },
  activeText: {
    fontSize: 13,
    fontWeight: '600',
    color: TP.color.pill.activeText
  },
});
