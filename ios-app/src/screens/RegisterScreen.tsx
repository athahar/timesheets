import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { TP } from '../styles/themeV2';
import { theme } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { TPButton } from '../components/v2/TPButton';
import { TPInput } from '../components/v2/TPInput';
import { AuthScreenTemplate } from '../components/AuthScreenTemplate';
import { directSupabase } from '../services/storageService';
import { simpleT } from '../i18n/simple';
// Analytics
import { capture, E } from '../services/analytics';
import ClientWelcomeModal from '../components/ClientWelcomeModal';

interface RegisterScreenProps {
  navigation: any;
  route?: {
    params?: {
      inviteCode?: string;
      providerId?: string;
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

  // Refs for return key flow
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Form state
  const [displayName, setDisplayName] = useState(inviteParams?.clientName || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'provider' | 'client' | null>(isInviteFlow ? autoRole : null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    role?: string;
  }>({});
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeProviderName, setWelcomeProviderName] = useState<string | undefined>(undefined);

  const { signUp, reloadUserProfile, isAuthenticated, user } = useAuth();

  // Monitor auth state changes after successful registration
  useEffect(() => {
    if (registrationSuccess && isAuthenticated && user) {
      const timer = setTimeout(() => {
        setRegistrationSuccess(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [registrationSuccess, isAuthenticated, user]);

  const validateForm = () => {
    const newErrors: {
      displayName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      role?: string;
    } = {};

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
      setErrors((prev) => ({ ...prev, displayName: undefined }));
    }
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

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const handleRoleChange = (newRole: 'provider' | 'client') => {
    setRole(newRole);
    if (errors.role) {
      setErrors((prev) => ({ ...prev, role: undefined }));
    }
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    // Analytics: Track registration submission
    capture(E.AUTH_REGISTER_SUBMITTED, {
      user_role: role!,
      success: false, // Will update on success
    });

    try {
      // Build invite context if this is an invite flow
      const inviteContext = isInviteFlow && inviteParams?.inviteCode && inviteParams?.providerId
        ? { inviteCode: inviteParams.inviteCode, providerId: inviteParams.providerId }
        : undefined;

      const { data, error } = await signUp(email, password, displayName, role!, isInviteFlow, inviteContext);

      if (error) {
        // Analytics: Track failure
        capture(E.AUTH_REGISTER_SUBMITTED, {
          user_role: role!,
          success: false,
          error_code: 'registration_failed',
        });

        Alert.alert(t('register.errors.failed'), error);
      } else {
        // Analytics: Track success (business_user_registered is handled by AuthContext)
        capture(E.AUTH_REGISTER_SUBMITTED, {
          user_role: role!,
          success: true,
        });
        setRegistrationSuccess(true);

        // If this is an invite flow, automatically claim the invite
        if (isInviteFlow && inviteParams?.inviteCode && data?.user) {
          try {
            await directSupabase.claimInvite(
              inviteParams.inviteCode,
              data.user.id,
              email,
              displayName
            );

            await new Promise((resolve) => setTimeout(resolve, 1000));
            await reloadUserProfile(data.user.id);

            // Client invited by provider → show branded modal with confetti
            if (role === 'client') {
              setWelcomeProviderName(inviteParams.inviterName ?? simpleT('common.provider'));
              setShowWelcomeModal(true);
            } else {
              // Provider invited by client (rare edge case) → keep Alert
              Alert.alert(
                t('register.success.welcome'),
                t('register.success.joinedWorkspace').replace(
                  '{{inviterName}}',
                  inviteParams.inviterName || ''
                )
              );
            }
          } catch (inviteError) {
            if (__DEV__) console.error('Error claiming invite after registration:', inviteError);
            Alert.alert(
              t('register.success.accountCreated'),
              t('register.success.useInviteAgain')
            );
          }
        } else {
          // Normal registration flow
          if (data?.user) {
            try {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              await reloadUserProfile(data.user.id);
            } catch (profileError) {
              if (__DEV__) {
                if (__DEV__) console.log('Profile reload error (non-critical):', profileError);
              }
            }
          }

          Alert.alert(t('register.success.welcome'), t('register.success.canStartUsing'));
        }
      }
    } catch (error) {
      Alert.alert(t('register.errors.error'), t('register.errors.unexpected'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreenTemplate
      title={t('register.title')}
      onBack={() => navigation.goBack()}
      subtitle={
        <Text style={styles.subtitle}>
          {t('register.subtitle')}
        </Text>
      }
      footer={
        <TPButton
          title={isLoading ? t('register.creating') : t('register.createButton')}
          onPress={handleSignUp}
          size="lg"
          disabled={isLoading}
        />
      }
    >
      {/* Full Name */}
      <TPInput
        label={t('register.fullName')}
        value={displayName}
        onChangeText={handleDisplayNameChange}
        placeholder={t('register.fullNamePlaceholder')}
        textContentType="name"
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        error={!!errors.displayName}
        errorMessage={errors.displayName}
      />

      {/* Email */}
      <TPInput
        ref={emailRef}
        label={t('register.email')}
        value={email}
        onChangeText={handleEmailChange}
        placeholder={t('register.emailPlaceholder')}
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
        label={t('register.password')}
        value={password}
        onChangeText={handlePasswordChange}
        placeholder={t('register.passwordPlaceholder')}
        secureTextEntry={!showPassword}
        textContentType="newPassword"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => confirmPasswordRef.current?.focus()}
        rightIcon={showPassword ? 'eye-off' : 'eye'}
        onRightIconPress={() => setShowPassword(!showPassword)}
        error={!!errors.password}
        errorMessage={errors.password}
      />

      {/* Confirm Password */}
      <TPInput
        ref={confirmPasswordRef}
        label={t('register.confirmPassword')}
        value={confirmPassword}
        onChangeText={handleConfirmPasswordChange}
        placeholder={t('register.confirmPasswordPlaceholder')}
        secureTextEntry={!showConfirmPassword}
        textContentType="newPassword"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={handleSignUp}
        rightIcon={showConfirmPassword ? 'eye-off' : 'eye'}
        onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
        error={!!errors.confirmPassword}
        errorMessage={errors.confirmPassword}
      />

      {/* Account Type Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('register.accountType')}</Text>

        {isInviteFlow ? (
          // Invite flow - show locked role
          <View style={styles.inviteRoleInfo}>
            <Text style={styles.inviteRoleText}>
              {role === 'client' ? t('register.roleClient') : t('register.roleProvider')}
            </Text>
            <Text style={styles.inviteRoleDescription}>
              {t('register.inviteJoiningAs')
                .replace(
                  '{{role}}',
                  role === 'client'
                    ? t('register.roleClient').toLowerCase()
                    : t('register.roleProvider').toLowerCase()
                )
                .replace('{{inviterName}}', inviteParams?.inviterName || '')}
            </Text>
          </View>
        ) : (
          // Normal flow - show role selection cards
          <View style={styles.roleSelection}>
            <TouchableOpacity
              style={[styles.roleCard, role === 'provider' && styles.roleCardSelected]}
              onPress={() => handleRoleChange('provider')}
              accessibilityRole="radio"
              accessibilityState={{ checked: role === 'provider' }}
            >
              <View style={styles.roleCardContent}>
                <View style={styles.radioContainer}>
                  <View
                    style={[styles.radioOuter, role === 'provider' && styles.radioOuterSelected]}
                  >
                    {role === 'provider' && <View style={styles.radioDot} />}
                  </View>
                </View>
                <View style={styles.roleTextContainer}>
                  <Text style={styles.roleTitle}>{t('register.roleProvider')}</Text>
                  <Text style={styles.roleDescription}>
                    {t('register.roleProviderDescription')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleCard, role === 'client' && styles.roleCardSelected]}
              onPress={() => handleRoleChange('client')}
              accessibilityRole="radio"
              accessibilityState={{ checked: role === 'client' }}
            >
              <View style={styles.roleCardContent}>
                <View style={styles.radioContainer}>
                  <View
                    style={[styles.radioOuter, role === 'client' && styles.radioOuterSelected]}
                  >
                    {role === 'client' && <View style={styles.radioDot} />}
                  </View>
                </View>
                <View style={styles.roleTextContainer}>
                  <Text style={styles.roleTitle}>{t('register.roleClient')}</Text>
                  <Text style={styles.roleDescription}>
                    {t('register.roleClientDescription')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
      </View>

      {/* Footer - Sign In Link */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('register.hasAccount')} </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.footerLink}>{t('register.signIn')}</Text>
        </TouchableOpacity>
      </View>

      {/* ClientWelcomeModal - MUST be inside AuthScreenTemplate for proper backdrop */}
      <ClientWelcomeModal
        visible={showWelcomeModal}
        providerName={welcomeProviderName}
        onContinue={async () => {
          try {
            await updateProfile({ hasSeenWelcome: true });
          } catch (error) {
            if (__DEV__) console.error('Failed to update profile:', error);
          }
          setShowWelcomeModal(false);
          navigation.replace('ServiceProviderList');
        }}
      />
    </AuthScreenTemplate>
  );
};

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'left',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: TP.color.ink,
    marginBottom: 8,
  },

  // Role Selection Cards
  roleSelection: {
    gap: 12,
  },
  roleCard: {
    backgroundColor: theme.color.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    minHeight: 72,
  },
  roleCardSelected: {
    borderColor: '#111827',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  roleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#111827',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#111827',
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TP.color.ink,
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B7280',
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
    marginBottom: 4,
  },
  inviteRoleDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Footer
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
  errorText: {
    fontSize: 13,
    color: TP.color.errorText,
    marginTop: 4,
    marginLeft: 4,
  },
});
