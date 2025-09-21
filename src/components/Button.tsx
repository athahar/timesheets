import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: any;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  style,
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button];

    // Size styles
    switch (size) {
      case 'sm':
        baseStyle.push(styles.buttonSm);
        break;
      case 'md':
        baseStyle.push(styles.buttonMd);
        break;
      case 'lg':
        baseStyle.push(styles.buttonLg);
        break;
    }

    // Variant styles
    if (disabled) {
      baseStyle.push(styles.buttonDisabled);
    } else {
      switch (variant) {
        case 'primary':
          baseStyle.push(styles.buttonPrimary, theme.shadows.button);
          break;
        case 'secondary':
          baseStyle.push(styles.buttonSecondary);
          break;
        case 'success':
          baseStyle.push(styles.buttonSuccess, theme.shadows.button);
          break;
        case 'warning':
          baseStyle.push(styles.buttonWarning, theme.shadows.button);
          break;
        case 'danger':
          baseStyle.push(styles.buttonDanger, theme.shadows.button);
          break;
      }
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text];

    // Size styles
    switch (size) {
      case 'sm':
        baseStyle.push({ fontSize: theme.fontSize.callout, fontWeight: theme.fontWeight.medium });
        break;
      case 'md':
        baseStyle.push({ fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold });
        break;
      case 'lg':
        baseStyle.push({ fontSize: theme.fontSize.headline, fontWeight: theme.fontWeight.semibold });
        break;
    }

    // Variant styles
    if (disabled) {
      baseStyle.push({ color: theme.colors.text.secondary });
    } else if (variant === 'secondary') {
      baseStyle.push({ color: theme.colors.success });
    } else {
      baseStyle.push({ color: '#FFFFFF' });
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[...getButtonStyle(), style]}
      activeOpacity={0.8}
    >
      <Text style={getTextStyle()}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.medium, // 8px for buttons
    paddingHorizontal: theme.spacing.lg,      // 24px
  },
  buttonSm: {
    paddingVertical: theme.spacing.xs,        // 8px
    minHeight: 44,                           // Apple's minimum touch target
    paddingHorizontal: theme.spacing.md,     // 16px
  },
  buttonMd: {
    paddingVertical: theme.spacing.sm,        // 12px
    minHeight: 48,
    paddingHorizontal: theme.spacing.lg,      // 24px
  },
  buttonLg: {
    paddingVertical: theme.spacing.md,        // 16px
    minHeight: 52,
    paddingHorizontal: theme.spacing.xl,      // 32px
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  buttonSuccess: {
    backgroundColor: theme.colors.success,
  },
  buttonWarning: {
    backgroundColor: theme.colors.warning,
  },
  buttonDanger: {
    backgroundColor: theme.colors.danger,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.text.tertiary,
    opacity: 0.6,
  },
  text: {
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: theme.fontWeight.semibold,
  },
});