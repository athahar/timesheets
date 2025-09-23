import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  AccessibilityInfo,
} from 'react-native';
import { theme } from '../styles/theme';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmStyle?: 'primary' | 'danger';
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmStyle = 'primary',
  loading = false,
}) => {
  const confirmButtonRef = useRef<any>(null);

  useEffect(() => {
    if (visible && confirmButtonRef.current) {
      const timer = setTimeout(() => {
        AccessibilityInfo.setAccessibilityFocus(confirmButtonRef.current);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const getConfirmButtonStyles = (pressed: boolean) => {
    const baseStyles = [styles.btnBase, styles.confirmButton];

    if (loading) {
      return [...baseStyles, styles.btnDisabled];
    }

    if (confirmStyle === 'danger') {
      return [
        ...baseStyles,
        styles.btnDanger,
        pressed && { backgroundColor: theme.color.btnDangerBgPressed },
      ];
    }

    return [
      ...baseStyles,
      styles.btnPrimary,
      pressed && { backgroundColor: theme.color.btnPrimaryBgPressed },
    ];
  };

  const getConfirmTextStyles = () => {
    if (loading) {
      return [styles.btnText, styles.btnDisabledText];
    }

    if (confirmStyle === 'danger') {
      return [styles.btnText, styles.btnDangerText];
    }

    return [styles.btnText, styles.btnPrimaryText];
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modal}>
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>

              <Text style={styles.message}>
                {message}
              </Text>

              <View style={styles.buttonContainer}>
                <Pressable
                  style={({pressed}) => [
                    styles.btnBase,
                    styles.cancelButton,
                    styles.btnSecondary,
                    pressed && { borderColor: theme.color.btnSecondaryBorderPressed },
                  ]}
                  onPress={onCancel}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel={cancelText}
                >
                  <Text style={[styles.btnText, styles.btnSecondaryText]}>
                    {cancelText}
                  </Text>
                </Pressable>

                <Pressable
                  ref={confirmButtonRef}
                  style={({pressed}) => getConfirmButtonStyles(pressed)}
                  onPress={onConfirm}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel={loading ? 'Processing...' : confirmText}
                  accessibilityState={{ disabled: loading }}
                >
                  <Text style={getConfirmTextStyles()}>
                    {loading ? 'Processing...' : confirmText}
                  </Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.color.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.space.x16,
  },
  modal: {
    backgroundColor: theme.color.modalBg,
    borderRadius: theme.radius.card,
    padding: theme.space.x24,
    width: '100%',
    maxWidth: 400,
    shadowColor: theme.color.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: theme.font.title,
    fontWeight: '600',
    color: theme.color.text,
    marginBottom: theme.space.x12,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.display,
  },
  message: {
    fontSize: theme.font.body,
    color: theme.color.textSecondary,
    marginBottom: theme.space.x24,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: theme.typography.fontFamily.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.space.x12,
  },
  btnBase: {
    height: 48,
    borderRadius: theme.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  btnPrimary: {
    backgroundColor: theme.color.btnPrimaryBg,
  },
  btnDanger: {
    backgroundColor: theme.color.btnDangerBg,
  },
  btnSecondary: {
    backgroundColor: theme.color.btnSecondaryBg,
    borderWidth: 1,
    borderColor: theme.color.btnSecondaryBorder,
  },
  btnDisabled: {
    backgroundColor: theme.color.btnDisabledBg,
    borderColor: theme.color.btnDisabledBorder,
  },
  btnText: {
    fontSize: theme.font.body,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.primary,
  },
  btnPrimaryText: {
    color: theme.color.btnPrimaryText,
  },
  btnDangerText: {
    color: theme.color.btnDangerText,
  },
  btnSecondaryText: {
    color: theme.color.btnSecondaryText,
  },
  btnDisabledText: {
    color: theme.color.btnDisabledText,
  },
  cancelButton: {
    marginRight: theme.space.x8,
  },
  confirmButton: {
    marginLeft: theme.space.x8,
  },
});