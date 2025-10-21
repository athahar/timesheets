import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { theme } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { TPButton } from '../components/v2/TPButton';
import { TPInput } from '../components/v2/TPInput';
import { AuthScreenTemplate } from '../components/AuthScreenTemplate';
import { simpleT } from '../i18n/simple';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  // Translation function
  const t = simpleT;

  // Refs for return key flow
  const passwordRef = useRef<TextInput>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);

  const { signIn } = useAuth();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = t('login.errors.emailRequired');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = t('login.errors.emailInvalid');
      }
    }

    if (!password) {
      newErrors.password = t('login.errors.passwordRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);

      if (error) {
        Alert.alert(t('login.errors.failed'), error);
      }
      // Navigation will be handled by AuthNavigator based on auth state
    } catch (error) {
      Alert.alert(t('login.errors.error'), t('login.errors.unexpected'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreenTemplate
      title={t('login.title')}
      onBack={() => navigation.goBack()}
      subtitle={
        <Text style={styles.subtitle}>
          {t('login.subtitle')}
        </Text>
      }
      footer={
        <TPButton
          title={isLoading ? t('login.signingIn') : t('login.signInButton')}
          onPress={handleSignIn}
          size="lg"
          disabled={isLoading}
        />
      }
    >
      {/* Email */}
      <TPInput
        label={t('login.email')}
        value={email}
        onChangeText={handleEmailChange}
        placeholder={t('login.emailPlaceholder')}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={!!errors.email}
        errorMessage={errors.email}
      />

      {/* Password */}
      <TPInput
        ref={passwordRef}
        label={t('login.password')}
        value={password}
        onChangeText={handlePasswordChange}
        placeholder={t('login.passwordPlaceholder')}
        secureTextEntry={!showPassword}
        textContentType="password"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={handleSignIn}
        rightIcon={showPassword ? 'eye-off' : 'eye'}
        onRightIconPress={() => setShowPassword(!showPassword)}
        error={!!errors.password}
        errorMessage={errors.password}
      />

      {/* Forgot Password Link */}
      <TouchableOpacity
        style={styles.forgotPassword}
        onPress={() => navigation.navigate('ForgotPassword')}
        accessibilityRole="button"
      >
        <Text style={styles.forgotPasswordText}>{t('login.forgotPassword')}</Text>
      </TouchableOpacity>

      {/* Footer - Create Account Link */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('login.noAccount')} </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.footerLink}>{t('login.createAccount')}</Text>
        </TouchableOpacity>
      </View>
    </AuthScreenTemplate>
  );
};

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'left',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  forgotPasswordText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.brand,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    minHeight: 44,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.brand,
  },
});
