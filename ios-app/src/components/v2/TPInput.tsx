import React, { useState, forwardRef } from 'react';
import { TextInput, View, Text, StyleSheet, ViewStyle, TextInputProps, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TP } from '../../styles/themeV2';

export interface TPInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  error?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  style?: ViewStyle;
  /** Icon name from Feather or custom React node */
  rightIcon?: 'eye' | 'eye-off' | React.ReactNode;
  /** Callback when right icon is pressed */
  onRightIconPress?: () => void;
}

/**
 * TPInput - TrackPay v2 Input Component
 *
 * Features:
 * - Optional label above input
 * - Prefix/suffix slots (e.g., "$", "/hr")
 * - Right icon slot (e.g., password visibility toggle)
 * - Green focus ring
 * - Error state styling
 * - Forward ref support for return key flow
 *
 * @example
 * // Basic input
 * <TPInput label="Email" value={email} onChangeText={setEmail} />
 *
 * // With prefix/suffix
 * <TPInput label="Hourly Rate" value={rate} onChangeText={setRate} prefix="$" suffix="/hr" />
 *
 * // Password with toggle
 * <TPInput
 *   label="Password"
 *   value={password}
 *   onChangeText={setPassword}
 *   secureTextEntry={!showPassword}
 *   rightIcon={showPassword ? 'eye-off' : 'eye'}
 *   onRightIconPress={() => setShowPassword(!showPassword)}
 * />
 */
export const TPInput = forwardRef<TextInput, TPInputProps>(
  (
    {
      label,
      value,
      onChangeText,
      placeholder,
      prefix,
      suffix,
      keyboardType = 'default',
      error = false,
      errorMessage,
      disabled = false,
      autoFocus = false,
      style,
      rightIcon,
      onRightIconPress,
      secureTextEntry,
      returnKeyType,
      onSubmitEditing,
      textContentType,
      autoCapitalize,
      autoCorrect,
      ...restProps
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const containerStyle = [
      styles.container,
      isFocused && styles.containerFocused,
      error && styles.containerError,
      disabled && styles.containerDisabled,
      style,
    ].filter(Boolean);

    const renderRightIcon = () => {
      if (!rightIcon) return null;

      // Handle eye/eye-off string icons
      if (typeof rightIcon === 'string') {
        const iconName = rightIcon as 'eye' | 'eye-off';
        return (
          <TouchableOpacity
            onPress={onRightIconPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.rightIconButton}
            accessibilityRole="button"
            accessibilityLabel={iconName === 'eye' ? 'Show password' : 'Hide password'}
          >
            <Feather name={iconName} size={20} color={TP.color.textSecondary} />
          </TouchableOpacity>
        );
      }

      // Custom React node
      return <View style={styles.rightIconButton}>{rightIcon}</View>;
    };

    return (
      <View style={styles.wrapper}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View style={containerStyle}>
          {prefix && <Text style={styles.affix}>{prefix}</Text>}
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={TP.color.textTertiary}
            keyboardType={keyboardType}
            editable={!disabled}
            autoFocus={autoFocus}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={styles.input}
            secureTextEntry={secureTextEntry}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            textContentType={textContentType}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            {...restProps}
          />
          {suffix && <Text style={styles.affix}>{suffix}</Text>}
          {renderRightIcon()}
        </View>
        {error && errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>
    );
  }
);

TPInput.displayName = 'TPInput';

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: TP.color.ink,
    marginBottom: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: TP.radius.input,
    borderWidth: 1,
    borderColor: TP.color.border,
    backgroundColor: TP.color.cardBg,
    paddingHorizontal: 14,
  },
  containerFocused: {
    borderColor: TP.color.brand,
    shadowColor: TP.color.brand,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  containerError: {
    borderColor: TP.color.errorText,
  },
  containerDisabled: {
    backgroundColor: TP.color.btn.disabledBg,
    borderColor: TP.color.btn.disabledBorder,
  },
  input: {
    flex: 1,
    fontSize: TP.font.body,
    color: TP.color.ink,
    fontWeight: TP.weight.regular,
  },
  affix: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.medium,
    color: TP.color.textSecondary,
    marginHorizontal: 4,
  },
  rightIconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10, // Compensate for container padding
  },
  errorText: {
    fontSize: TP.font.footnote,
    color: TP.color.errorText,
    marginTop: 4,
    marginLeft: 4,
  },
});
