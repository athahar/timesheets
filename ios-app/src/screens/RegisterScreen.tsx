import React, { useState, useEffect } from 'react';
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
import { Feather } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { StickyCTA } from '../components/StickyCTA';
import { directSupabase } from '../services/storageService';
import { simpleT, getCurrentLanguageSimple } from '../i18n/simple';

interface RegisterScreenProps {
  navigation: any;
  route?: {
    params?: {
      inviteCode?: string;
      inviterName?: string;
      inviterRole?: 'provider' | 'client';
      clientName?: string;
    };
  };
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation, route }) => {
  // Translation function
  const t = simpleT;

  // Extract invite parameters
  const inviteParams = route?.params;
  const isInviteFlow = !!inviteParams?.inviteCode;

  // Determine user role based on inviter role
  const autoRole = inviteParams?.inviterRole === 'provider' ? 'client' : 'provider';

  const [displayName, setDisplayName] = useState(inviteParams?.clientName || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'provider' | 'client' | null>(isInviteFlow ? autoRole : null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{displayName?: string; email?: string; password?: string; confirmPassword?: string; role?: string}>({});
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { signUp, reloadUserProfile, isAuthenticated, user } = useAuth();

  // Monitor auth state changes after successful registration
  useEffect(() => {
    if (registrationSuccess && isAuthenticated && user) {
      // Give a moment for the auth state to fully settle
      const timer = setTimeout(() => {
        // The AuthNavigator will handle the navigation automatically
        // No need to manually navigate here - just clear the flag
        setRegistrationSuccess(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [registrationSuccess, isAuthenticated, user]);

  const validateForm = () => {
    const newErrors: {displayName?: string; email?: string; password?: string; confirmPassword?: string; role?: string} = {};

    if (!displayName.trim()) {
      newErrors.displayName = t('register.errors.displayNameRequired');
    }

    if (!email.trim()) {
      newErrors.email = t('register.errors.emailRequired');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = t('register.errors.emailInvalid');
      }
    }

    if (!password) {
      newErrors.password = t('register.errors.passwordRequired');
    } else if (password.length < 6) {
      newErrors.password = t('register.errors.passwordTooShort');
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t('register.errors.confirmPasswordRequired');
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t('register.errors.passwordMismatch');
    }

    if (!role) {
      newErrors.role = t('register.errors.roleRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDisplayNameChange = (text: string) => {
    setDisplayName(text);
    if (errors.displayName) {
      setErrors(prev => ({ ...prev, displayName: undefined }));
    }
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

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (errors.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const handleRoleChange = (newRole: 'provider' | 'client') => {
    setRole(newRole);
    if (errors.role) {
      setErrors(prev => ({ ...prev, role: undefined }));
    }
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { data, error } = await signUp(email, password, displayName, role!, isInviteFlow);

      if (error) {
        Alert.alert(t('register.errors.failed'), error);
      } else {
        // Set registration success flag to trigger auth state monitoring
        setRegistrationSuccess(true);

        // If this is an invite flow, automatically claim the invite
        if (isInviteFlow && inviteParams?.inviteCode && data?.user) {
          try {
            const { providerId } = await directSupabase.claimInvite(inviteParams.inviteCode, data.user.id, email, displayName);

            // Wait a moment for auth state to update, then reload the user profile
            await new Promise(resolve => setTimeout(resolve, 1000));
            await reloadUserProfile(data.user.id);

            // Show success message but don't navigate manually - let auth state handle it
            Alert.alert(
              t('register.success.welcome'),
              t('register.success.joinedWorkspace').replace('{{inviterName}}', inviteParams.inviterName)
            );
          } catch (inviteError) {
            console.error('Error claiming invite after registration:', inviteError);
            // Still show success - the user can claim the invite later
            Alert.alert(
              t('register.success.accountCreated'),
              t('register.success.useInviteAgain')
            );
          }
        } else {
          // Normal registration flow - reload user profile to ensure it's available
          if (data?.user) {
            try {
              await new Promise(resolve => setTimeout(resolve, 1000));
              await reloadUserProfile(data.user.id);
            } catch (profileError) {
              if (__DEV__) { console.log('Profile reload error (non-critical):', profileError); }
            }
          }

          // Show success message without navigation
          // The auth state monitoring will handle navigation automatically
          Alert.alert(
            t('register.success.welcome'),
            t('register.success.canStartUsing')
          );
        }
      }
    } catch (error) {
      Alert.alert(t('register.errors.error'), t('register.errors.unexpected'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Feather name="chevron-left" size={24} color={theme.color.text} />
              </TouchableOpacity>
              <View style={styles.headerContent}>
                <Text style={styles.title}>{t('register.title')}</Text>
                <Text style={styles.subtitle}>{t('register.subtitle')}</Text>
              </View>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('register.fullName')}</Text>
                <TextInput
                  style={[styles.input, errors.displayName && styles.inputError]}
                  value={displayName}
                  onChangeText={handleDisplayNameChange}
                  placeholder={t('register.fullNamePlaceholder')}
                  placeholderTextColor={theme.color.textSecondary}
                  autoComplete="name"
                />
                {errors.displayName && <Text style={styles.errorText}>{errors.displayName}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('register.email')}</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={email}
                  onChangeText={handleEmailChange}
                  placeholder={t('register.emailPlaceholder')}
                  placeholderTextColor={theme.color.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('register.password')}</Text>
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  value={password}
                  onChangeText={handlePasswordChange}
                  placeholder={t('register.passwordPlaceholder')}
                  placeholderTextColor={theme.color.textSecondary}
                  secureTextEntry
                  autoComplete="password-new"
                />
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('register.confirmPassword')}</Text>
                <TextInput
                  style={[styles.input, errors.confirmPassword && styles.inputError]}
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  placeholder={t('register.confirmPasswordPlaceholder')}
                  placeholderTextColor={theme.color.textSecondary}
                  secureTextEntry
                  autoComplete="password-new"
                />
                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
              </View>

              {/* Account Type Selection */}
              {isInviteFlow ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('register.accountType')}</Text>
                  <View style={styles.inviteRoleInfo}>
                    <Text style={styles.inviteRoleText}>
                      {role === 'client' ? t('register.roleClient') : t('register.roleProvider')}
                    </Text>
                    <Text style={styles.inviteRoleDescription}>
                      {t('register.inviteJoiningAs').replace('{{role}}', role === 'client' ? t('register.roleClient').toLowerCase() : t('register.roleProvider').toLowerCase()).replace('{{inviterName}}', inviteParams?.inviterName || '')}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('register.accountType')}</Text>
                  <View style={styles.roleSelection}>
                    <TouchableOpacity
                      style={[
                        styles.roleCard,
                        role === 'provider' && styles.roleCardSelected,
                      ]}
                      onPress={() => handleRoleChange('provider')}
                    >
                      <Text style={styles.roleTitle}>{t('register.roleProvider')}</Text>
                      <Text style={styles.roleDescription}>
                        {t('register.roleProviderDescription')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.roleCard,
                        role === 'client' && styles.roleCardSelected,
                      ]}
                      onPress={() => handleRoleChange('client')}
                    >
                      <Text style={styles.roleTitle}>{t('register.roleClient')}</Text>
                      <Text style={styles.roleDescription}>
                        {t('register.roleClientDescription')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>{t('register.hasAccount')} </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.footerLink}>{t('register.signIn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky bottom CTA */}
      <StickyCTA
        primaryButton={{
          title: isLoading ? t('register.creating') : t('register.createButton'),
          onPress: handleSignUp,
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
    paddingLeft: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.display,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
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

  // Role Selection
  roleSelection: {
    gap: 12,
  },
  roleCard: {
    backgroundColor: theme.color.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: 16,
    minHeight: 72,
    justifyContent: 'center',
  },
  roleCardSelected: {
    borderColor: theme.color.brand,
    borderWidth: 2,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 18,
  },

  // Invite Role Info
  inviteRoleInfo: {
    backgroundColor: theme.color.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    padding: 16,
    alignItems: 'center',
  },
  inviteRoleText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.brand,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 4,
  },
  inviteRoleDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Actions
  signUpButton: {
    marginTop: 20,
    marginBottom: 20,
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