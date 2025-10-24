import React, { useState } from 'react';
import { View, Text, StyleSheet, Share, TouchableOpacity, ScrollView, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { TPModal } from './v2/TPModal';
import { TP } from '../styles/themeV2';
import { simpleT } from '../i18n/simple';
import { capture } from '../services/analytics';
import { E } from '../services/analytics/events';

export interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  userRole: 'provider' | 'client';
}

/**
 * ShareModal - Share TrackPay with others
 *
 * Uses native Share API to share App Store link
 * Fallback to copy-to-clipboard if share unavailable
 * Emits analytics events for share intent
 */
export const ShareModal: React.FC<ShareModalProps> = ({
  visible,
  onClose,
  userRole,
}) => {
  const [showCopiedFeedback, setShowCopiedFeedback] = useState(false);

  // Get App Store ID from environment (placeholder if not set)
  const appStoreId = process.env.EXPO_PUBLIC_APP_STORE_ID || 'placeholder';
  const appStoreLink = `https://apps.apple.com/app/id${appStoreId}`;
  const shareMessage = simpleT('share.message', { link: appStoreLink });

  const handleShare = async () => {
    // Analytics: share intent triggered
    capture(E.SHARE_INTENT_TRIGGERED, {
      role: userRole,
    });

    try {
      const result = await Share.share({
        message: shareMessage,
        url: Platform.OS === 'ios' ? appStoreLink : undefined, // iOS supports separate URL
      });

      if (__DEV__) {
        if (result.action === Share.sharedAction) {
          if (__DEV__) console.log('Share successful');
        } else if (result.action === Share.dismissedAction) {
          if (__DEV__) console.log('Share dismissed');
        }
      }
    } catch (error) {
      if (__DEV__) {
        if (__DEV__) console.error('Error sharing:', error);
      }
      // Fallback to copy
      handleCopy();
    }
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(shareMessage);
      setShowCopiedFeedback(true);

      // Reset feedback after 2 seconds
      setTimeout(() => {
        setShowCopiedFeedback(false);
      }, 2000);
    } catch (error) {
      if (__DEV__) {
        if (__DEV__) console.error('Error copying to clipboard:', error);
      }
    }
  };

  return (
    <TPModal
      visible={visible}
      onClose={onClose}
      title={simpleT('share.title')}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Text style={styles.hero}>{simpleT('share.hero')}</Text>

        {/* Body */}
        <Text style={styles.body}>{simpleT('share.body')}</Text>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          accessibilityLabel={simpleT('share.shareButton')}
          accessibilityRole="button"
        >
          <Feather name="share-2" size={20} color={TP.color.white} />
          <Text style={styles.shareButtonText}>{simpleT('share.shareButton')}</Text>
        </TouchableOpacity>

        {/* Message Display with Copy */}
        <View style={styles.messageDisplay}>
          <View style={styles.messageLabelRow}>
            <Text style={styles.messageLabel}>{simpleT('share.copyLabel')}</Text>
            <TouchableOpacity
              onPress={handleCopy}
              style={styles.copyButton}
              accessibilityLabel="Copy message to clipboard"
              accessibilityRole="button"
            >
              <Feather
                name={showCopiedFeedback ? 'check' : 'copy'}
                size={16}
                color={showCopiedFeedback ? TP.color.success : TP.color.primary}
              />
              <Text style={[
                styles.copyButtonText,
                showCopiedFeedback && styles.copyButtonTextSuccess
              ]}>
                {showCopiedFeedback ? 'Copied!' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.messageText}>{shareMessage}</Text>
        </View>

        {/* Fallback Note */}
        <Text style={styles.fallback}>{simpleT('share.fallback')}</Text>
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
  shareButton: {
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
  shareButtonText: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.white,
  },
  messageDisplay: {
    backgroundColor: TP.color.cardBg,
    padding: TP.spacing.x16,
    borderRadius: TP.radius.card,
    borderWidth: 1,
    borderColor: TP.color.border,
    marginBottom: TP.spacing.x16,
  },
  messageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: TP.spacing.x8,
  },
  messageLabel: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.medium,
    color: TP.color.textSecondary,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TP.spacing.x4,
    paddingVertical: TP.spacing.x4,
    paddingHorizontal: TP.spacing.x8,
  },
  copyButtonText: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.semibold,
    color: TP.color.primary,
  },
  copyButtonTextSuccess: {
    color: TP.color.success,
  },
  messageText: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.regular,
    color: TP.color.ink,
    lineHeight: 22,
  },
  fallback: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.regular,
    color: TP.color.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
