import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { simpleT } from '../i18n/simple';
import { theme } from '../styles/theme';

interface StickyCTAProps {
  primaryButton: {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
  secondaryButton?: {
    title: string;
    onPress: () => void;
    disabled?: boolean;
  };
  backgroundColor?: string;
  shadow?: boolean;
}

export const StickyCTA: React.FC<StickyCTAProps> = ({
  primaryButton,
  secondaryButton,
  backgroundColor = '#FFFFFF',
  shadow = true,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.container,
          { backgroundColor },
          shadow && styles.shadow,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={styles.buttonContainer}>
          {secondaryButton && (
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                secondaryButton.disabled && styles.disabledButton,
              ]}
              onPress={secondaryButton.onPress}
              disabled={secondaryButton.disabled}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.secondaryButtonText,
                secondaryButton.disabled && styles.disabledButtonText,
              ]}>
                {secondaryButton.title}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              primaryButton.disabled && styles.disabledButton,
              secondaryButton ? styles.primaryButtonWithSecondary : styles.primaryButtonFull,
            ]}
            onPress={primaryButton.onPress}
            disabled={primaryButton.disabled || primaryButton.loading}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.primaryButtonText,
              primaryButton.disabled && styles.disabledButtonText,
            ]}>
              {primaryButton.loading ? simpleT('confirmation.processing') : primaryButton.title}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: theme.color.brand,
    borderRadius: theme.radius.button,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  primaryButtonFull: {
    flex: 1,
  },
  primaryButtonWithSecondary: {
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.button,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    flex: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: theme.font.body,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.primary,
  },
  secondaryButtonText: {
    color: theme.color.text,
    fontSize: theme.font.body,
    fontWeight: '500',
    fontFamily: theme.typography.fontFamily.primary,
  },
  disabledButtonText: {
    opacity: 0.6,
  },
});