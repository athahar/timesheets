import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet, ViewStyle, TextInputProps, KeyboardTypeOptions } from 'react-native';
import { TP } from '../../styles/themeV2';

export interface TPInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  keyboardType?: KeyboardTypeOptions;
  error?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  style?: ViewStyle;
}

/**
 * TPInput - TrackPay v2 Input Component with Prefix/Suffix
 *
 * Features:
 * - Prefix slot (e.g., "$" for money)
 * - Suffix slot (e.g., "/hr" for rates)
 * - Green focus ring
 * - Error state styling
 * - Keyboard type variants
 *
 * @example
 * <TPInput value={rate} onChangeText={setRate} prefix="$" suffix="/hr" keyboardType="decimal-pad" />
 */
export const TPInput: React.FC<TPInputProps> = ({
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
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const containerStyle: ViewStyle[] = [
    styles.container,
    isFocused && styles.containerFocused,
    error && styles.containerError,
    disabled && styles.containerDisabled,
    style,
  ];

  return (
    <View>
      <View style={containerStyle}>
        {prefix && <Text style={styles.affix}>{prefix}</Text>}
        <TextInput
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
        />
        {suffix && <Text style={styles.affix}>{suffix}</Text>}
      </View>
      {error && errorMessage && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
  errorText: {
    fontSize: TP.font.footnote,
    color: TP.color.errorText,
    marginTop: 4,
    marginLeft: 4,
  },
});
