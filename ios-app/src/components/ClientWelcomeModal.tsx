/**
 * ClientWelcomeModal
 *
 * Success modal shown after client claims an invite for the first time.
 * Features:
 * - Branded welcome message with provider name
 * - Optional confetti animation (feature flag)
 * - Haptic feedback
 * - Accessibility support (reduce motion)
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  AccessibilityInfo,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { TP } from '../styles/themeV2';
import { simpleT } from '../i18n/simple';

// Conditional import for confetti (npm install not yet run)
let ConfettiCannon: any = null;
try {
  ConfettiCannon = require('react-native-confetti-cannon').default;
} catch {
  // Silently fail if not installed yet
}

type Props = {
  visible: boolean;
  providerName?: string;
  onContinue: () => void;
  testID?: string;
};

export default function ClientWelcomeModal({
  visible,
  providerName,
  onContinue,
  testID = 'clientWelcomeModal',
}: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);

  // Feature flag for confetti
  const confettiEnabled =
    process.env.EXPO_PUBLIC_USE_CONFETTI === 'true' &&
    ConfettiCannon !== null &&
    !reduceMotion;

  // Check accessibility settings
  useEffect(() => {
    const checkMotion = async () => {
      const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      setReduceMotion(isReduceMotionEnabled);
    };
    checkMotion();
  }, []);

  // Trigger haptic feedback when modal appears
  useEffect(() => {
    if (visible) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Silently fail on simulator
        if (__DEV__) {
          console.log('[ClientWelcomeModal] Haptic feedback not available');
        }
      }
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      testID={testID}
      accessibilityViewIsModal
    >
      <TouchableWithoutFeedback>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.card}>
              {/* Title */}
              <Text style={styles.title} accessibilityRole="header">
                {simpleT('clientWelcome.title')}
              </Text>

              {/* Subtitle with provider name */}
              <Text style={styles.subtitle}>
                {simpleT('clientWelcome.subtitle', { providerName: providerName || '' })}
              </Text>

              {/* Continue button */}
              <Pressable
                style={({ pressed }) => [
                  styles.cta,
                  pressed && styles.ctaPressed,
                ]}
                onPress={onContinue}
                testID="clientWelcomeContinue"
                accessibilityRole="button"
                accessibilityLabel={simpleT('clientWelcome.cta')}
              >
                <Text style={styles.ctaText}>
                  {simpleT('clientWelcome.cta')}
                </Text>
              </Pressable>
            </View>
          </TouchableWithoutFeedback>

          {/* Confetti animation (if enabled) */}
          {confettiEnabled && ConfettiCannon && (
            <ConfettiCannon
              count={80}
              origin={{ x: 0, y: 0 }}
              fadeOut
              autoStart
              explosionSpeed={350}
              fallSpeed={2000}
            />
          )}
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: TP.color.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: TP.spacing.x16,
  },
  card: {
    backgroundColor: TP.color.modalBg,
    borderRadius: TP.radius.card,
    padding: TP.spacing.x24,
    width: '100%',
    maxWidth: 400,
    ...TP.shadow.card.ios,
  },
  title: {
    fontSize: TP.font.title,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
    marginBottom: TP.spacing.x12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.regular,
    color: TP.color.textSecondary,
    marginBottom: TP.spacing.x24,
    textAlign: 'center',
    lineHeight: 22,
  },
  cta: {
    height: 48,
    borderRadius: TP.radius.button,
    backgroundColor: TP.color.btn.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    backgroundColor: TP.color.btn.primaryBgPressed,
  },
  ctaText: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.btn.primaryText,
  },
});
