import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TP } from '../../styles/themeV2';
import { ButtonStyles } from '../../styles/components';

export interface TPButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: 'play' | 'stop' | 'send' | null;
  fullWidth?: boolean;
  style?: ViewStyle;
}

/**
 * TPButton - TrackPay v2 Primary Button Component
 *
 * Features:
 * - 3 variants: primary (green), secondary (outline), danger (red)
 * - 3 sizes: sm (48px), md (52px), lg (56px)
 * - Icon support (play, stop, send)
 * - Loading state with spinner
 * - Press feedback
 * - Full width option
 *
 * @example
 * <TPButton title="Start Session" variant="primary" icon="play" onPress={handleStart} />
 */
export const TPButton: React.FC<TPButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = null,
  fullWidth = false,
  style,
}) => {
  const getButtonStyle = (): ViewStyle[] => {
    const styles: ViewStyle[] = [ButtonStyles.base];

    // Size
    if (size === 'sm') {
      styles.push({ height: 48 });
    } else if (size === 'lg') {
      styles.push({ height: 56 });
    }

    // Variant
    if (disabled) {
      styles.push(ButtonStyles.disabled);
    } else {
      if (variant === 'primary') {
        styles.push(ButtonStyles.primary);
      } else if (variant === 'secondary') {
        styles.push(ButtonStyles.secondary);
      } else if (variant === 'danger') {
        styles.push(ButtonStyles.danger);
      }
    }

    // Full width
    if (fullWidth) {
      styles.push({ width: '100%' });
    }

    // Custom style
    if (style) {
      styles.push(style);
    }

    return styles;
  };

  const getTextStyle = () => {
    if (disabled) {
      return ButtonStyles.disabledText;
    }
    if (variant === 'primary') {
      return ButtonStyles.primaryText;
    }
    if (variant === 'secondary') {
      return ButtonStyles.secondaryText;
    }
    if (variant === 'danger') {
      return ButtonStyles.dangerText;
    }
    return ButtonStyles.primaryText;
  };

  const getIconName = (): any => {
    if (icon === 'play') return 'play';
    if (icon === 'stop') return 'square';
    if (icon === 'send') return 'send';
    return null;
  };

  const iconName = getIconName();
  const textStyle = getTextStyle();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={getButtonStyle()}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' ? TP.color.ink : TP.color.btn.primaryText}
        />
      ) : (
        <View style={localStyles.content}>
          {iconName && (
            <Feather
              name={iconName}
              size={18}
              color={textStyle.color as string}
              style={localStyles.icon}
            />
          )}
          <Text style={textStyle}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const localStyles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
});
