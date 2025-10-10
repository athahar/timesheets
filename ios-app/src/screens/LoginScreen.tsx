import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { theme } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { IOSHeader } from '../components/IOSHeader';
import { StickyCTA } from '../components/StickyCTA';
import { simpleT, getCurrentLanguageSimple } from '../i18n/simple';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  // Translation function
  const t = simpleT;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});
  const { signIn } = useAuth();

  const validateForm = () => {
    const newErrors: {email?: string; password?: string} = {};

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
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: undefined }));
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
    <SafeAreaView style={styles.container}>
      <IOSHeader
        title={t('login.title')}
        subtitle={t('login.subtitle')}
        leftAction={{
          title: t('login.back'),
          onPress: () => navigation.goBack(),
        }}
        largeTitleStyle="always"
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('login.email')}</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={email}
                  onChangeText={handleEmailChange}
                  placeholder={t('login.emailPlaceholder')}
                  placeholderTextColor={theme.color.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('login.password')}</Text>
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  value={password}
                  onChangeText={handlePasswordChange}
                  placeholder={t('login.passwordPlaceholder')}
                  placeholderTextColor={theme.color.textSecondary}
                  secureTextEntry
                  autoComplete="password"
                />
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.forgotPasswordText}>{t('login.forgotPassword')}</Text>
              </TouchableOpacity>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>{t('login.noAccount')} </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.footerLink}>{t('login.createAccount')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky bottom CTA */}
      <StickyCTA
        primaryButton={{
          title: isLoading ? t('login.signingIn') : t('login.signInButton'),
          onPress: handleSignIn,
          disabled: isLoading,
          loading: isLoading,
        }}
        backgroundColor={theme.color.appBg}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.appBg,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },


  // Form
  form: {
    flex: 1,
    paddingTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: theme.color.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.color.border,
    paddingHorizontal: 16,
    fontSize: 16,
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    fontFamily: theme.typography.fontFamily.primary,
    marginTop: 4,
    marginLeft: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    minHeight: 44,
    justifyContent: 'center',
  },
  forgotPasswordText: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.color.brand,
    fontFamily: theme.typography.fontFamily.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
    minHeight: 44,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  footerLink: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.brand,
    fontFamily: theme.typography.fontFamily.primary,
  },
});