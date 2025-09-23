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
} from 'react-native';
import { theme } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { IOSHeader } from '../components/IOSHeader';

interface ForgotPasswordScreenProps {
  navigation: any;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { resetPassword } = useAuth();

  const validateEmail = () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      const { error } = await resetPassword(email);

      if (error) {
        Alert.alert('Reset Failed', error);
      } else {
        setEmailSent(true);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <SafeAreaView style={styles.container}>
        <IOSHeader
          title="Check Your Email"
          leftAction={{
            title: "Back",
            onPress: () => navigation.goBack(),
          }}
          largeTitleStyle="always"
        />
        <View style={styles.content}>

          <View style={styles.successContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.successIcon}>📧</Text>
            </View>
            <Text style={styles.successTitle}>Check Your Email</Text>
            <Text style={styles.successMessage}>
              We've sent a password reset link to {email}.
              Check your email and follow the instructions to reset your password.
            </Text>
            <Text style={styles.note}>
              Didn't receive the email? Check your spam folder or try again.
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              title="Try Again"
              onPress={() => setEmailSent(false)}
              variant="secondary"
              size="lg"
              style={styles.actionButton}
            />
            <Button
              title="Back to Sign In"
              onPress={() => navigation.navigate('Login')}
              variant="primary"
              size="lg"
              style={styles.actionButton}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <IOSHeader
        title="Reset Password"
        subtitle="We'll email you a reset link"
        leftAction={{
          title: "Back",
          onPress: () => navigation.goBack(),
        }}
        largeTitleStyle="always"
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={theme.color.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>

            <Button
              title={isLoading ? "Sending..." : "Send Reset Link"}
              onPress={handleResetPassword}
              variant="primary"
              size="lg"
              disabled={isLoading}
              style={styles.resetButton}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    paddingHorizontal: theme.space.x32,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: theme.space.x32,
    marginBottom: theme.space.x32,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: theme.space.x12,
    marginBottom: theme.space.x24,
    minHeight: 44,
  },
  backButtonText: {
    fontSize: theme.font.body,
    color: theme.color.btnLinkText,
    fontFamily: theme.typography.fontFamily.primary,
  },
  title: {
    fontSize: theme.font.large,
    fontWeight: theme.fontWeight.bold,
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.display,
    marginBottom: theme.space.x8,
  },
  subtitle: {
    fontSize: theme.font.body,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: theme.space.x24,
  },
  label: {
    fontSize: theme.font.body,
    fontWeight: theme.fontWeight.medium,
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.space.x8,
  },
  input: {
    backgroundColor: theme.color.cardBg,
    borderRadius: theme.radius.input,
    paddingHorizontal: theme.space.x16,
    paddingVertical: theme.space.x16,
    fontSize: theme.font.body,
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    borderWidth: 1,
    borderColor: theme.color.border,
    minHeight: 48,
    ...theme.shadow.cardLight.ios,
  },
  resetButton: {
    marginBottom: theme.space.x24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: theme.space.x32,
    minHeight: 44,
  },
  footerText: {
    fontSize: theme.font.body,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  footerLink: {
    fontSize: theme.font.body,
    color: theme.color.btnLinkText,
    fontWeight: theme.fontWeight.medium,
    fontFamily: theme.typography.fontFamily.primary,
  },
  // Success state styles
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.space.x24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.space.x24,
  },
  successIcon: {
    fontSize: 32,
  },
  successTitle: {
    fontSize: theme.font.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.display,
    marginBottom: theme.space.x16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: theme.font.body,
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.space.x16,
  },
  note: {
    fontSize: theme.font.small,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
  },
  actions: {
    paddingBottom: theme.space.x32,
  },
  actionButton: {
    marginBottom: theme.space.x12,
  },
});