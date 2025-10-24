import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { TPModal } from './v2/TPModal';
import { TP } from '../styles/themeV2';
import { simpleT } from '../i18n/simple';
import { capture } from '../services/analytics';
import { E } from '../services/analytics/events';

export interface ContactModalProps {
  visible: boolean;
  onClose: () => void;
  userRole: 'provider' | 'client';
}

/**
 * ContactModal - Contact TrackPay support
 *
 * Opens mailto with pre-filled subject and body including app version
 * Emits analytics events for contact email tap
 */
export const ContactModal: React.FC<ContactModalProps> = ({
  visible,
  onClose,
  userRole,
}) => {
  const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'hello@trackpay.app';
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const handleEmailSupport = () => {
    // Analytics: contact email tapped
    capture(E.CONTACT_EMAIL_TAPPED, {
      role: userRole,
    });

    const subject = simpleT('contact.emailSubject');
    const body = simpleT('contact.emailBody', { version: appVersion });

    const mailtoUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    Linking.openURL(mailtoUrl).catch((err) => {
      if (__DEV__) {
        if (__DEV__) console.error('Failed to open email client:', err);
      }
    });
  };

  return (
    <TPModal
      visible={visible}
      onClose={onClose}
      title={simpleT('contact.title')}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Text style={styles.hero}>{simpleT('contact.hero')}</Text>

        {/* Body */}
        <Text style={styles.body}>{simpleT('contact.body')}</Text>

        {/* Email Support Button */}
        <TouchableOpacity
          style={styles.emailButton}
          onPress={handleEmailSupport}
          accessibilityLabel={simpleT('contact.emailButton')}
          accessibilityRole="button"
        >
          <Feather name="mail" size={20} color={TP.color.white} />
          <Text style={styles.emailButtonText}>{simpleT('contact.emailButton')}</Text>
        </TouchableOpacity>

        {/* Support Email Display */}
        <View style={styles.emailDisplay}>
          <Text style={styles.emailLabel}>{simpleT('contact.emailLabel')}</Text>
          <TouchableOpacity
            onPress={handleEmailSupport}
            accessibilityLabel={`Email support at ${supportEmail}`}
            accessibilityRole="button"
          >
            <Text style={styles.emailAddress}>{supportEmail}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>{simpleT('contact.footer')}</Text>
      </ScrollView>
    </TPModal>
  );
};

const styles = StyleSheet.create({
  hero: {
    fontSize: TP.font.largeTitle,
    fontWeight: TP.weight.bold,
    color: TP.color.ink,
    marginBottom: TP.spacing.x16,
    textAlign: 'center',
  },
  body: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.regular,
    color: TP.color.textSecondary,
    marginBottom: TP.spacing.x24,
    lineHeight: 22,
    textAlign: 'center',
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TP.color.primary,
    paddingVertical: TP.spacing.x16,
    paddingHorizontal: TP.spacing.x24,
    borderRadius: TP.radius.button,
    gap: TP.spacing.x8,
    marginBottom: TP.spacing.x20,
    ...TP.shadow.button.ios,
    elevation: 2,
  },
  emailButtonText: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.white,
  },
  emailDisplay: {
    backgroundColor: TP.color.cardBg,
    padding: TP.spacing.x16,
    borderRadius: TP.radius.card,
    borderWidth: 1,
    borderColor: TP.color.border,
    marginBottom: TP.spacing.x16,
  },
  emailLabel: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.medium,
    color: TP.color.textSecondary,
    marginBottom: TP.spacing.x8,
  },
  emailAddress: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.primary,
  },
  footer: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.regular,
    color: TP.color.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
