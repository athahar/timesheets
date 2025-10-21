import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TPButton } from './TPButton';
import { TP } from '../../styles/themeV2';

export interface TPModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  children?: React.ReactNode;
  primaryButton?: { title: string; onPress: () => void; loading?: boolean };
  secondaryButton?: { title: string; onPress: () => void };
}

/**
 * TPModal - Modal Sheet Component
 *
 * Features:
 * - 50% black overlay
 * - Bottom sheet on mobile, centered on web/tablet
 * - Close button (X top-right)
 * - Title + optional message
 * - Button row (secondary + primary)
 *
 * @example
 * <TPModal
 *   visible={visible}
 *   onClose={onClose}
 *   title="Did you pay $540 to Lucy?"
 *   primaryButton={{ title: "Yes, Mark as Paid", onPress: handleConfirm }}
 *   secondaryButton={{ title: "Not yet", onPress: onClose }}
 * />
 */
export const TPModal: React.FC<TPModalProps> = ({
  visible,
  onClose,
  title,
  message,
  children,
  primaryButton,
  secondaryButton,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          {/* Header with close button */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={TP.color.ink} />
            </TouchableOpacity>
          </View>

          {/* Message */}
          {message && <Text style={styles.message}>{message}</Text>}

          {/* Custom children */}
          {children && <View style={styles.content}>{children}</View>}

          {/* Button row */}
          {(primaryButton || secondaryButton) && (
            <View style={styles.buttonRow}>
              {secondaryButton && (
                <TPButton
                  title={secondaryButton.title}
                  variant="secondary"
                  onPress={secondaryButton.onPress}
                  style={styles.button}
                />
              )}
              {primaryButton && (
                <TPButton
                  title={primaryButton.title}
                  variant="primary"
                  onPress={primaryButton.onPress}
                  loading={primaryButton.loading}
                  style={styles.button}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: TP.color.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: TP.spacing.x20,
  },
  sheet: {
    backgroundColor: TP.color.modalBg,
    borderRadius: TP.radius.card,
    padding: TP.spacing.x24,
    width: '100%',
    maxWidth: 400,
    // Shadow
    ...TP.shadow.card.ios,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: TP.spacing.x12,
  },
  title: {
    fontSize: TP.font.title,
    fontWeight: TP.weight.bold,
    color: TP.color.ink,
    flex: 1,
    paddingRight: TP.spacing.x12,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -12,
  },
  message: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.medium,
    color: TP.color.textSecondary,
    marginBottom: TP.spacing.x16,
  },
  content: {
    marginBottom: TP.spacing.x16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: TP.spacing.x12,
  },
  button: {
    flex: 1,
  },
});
