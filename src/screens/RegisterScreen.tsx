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
import { Button } from '../components/Button';
import { directSupabase } from '../services/storageService';

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
  // Extract invite parameters
  const inviteParams = route?.params;
  const isInviteFlow = !!inviteParams?.inviteCode;

  // Determine user role based on inviter role
  const autoRole = inviteParams?.inviterRole === 'provider' ? 'client' : 'provider';

  const [displayName, setDisplayName] = useState(inviteParams?.clientName || ''); // Pre-fill with client name from invite
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'provider' | 'client' | null>(isInviteFlow ? autoRole : null);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, reloadUserProfile } = useAuth();

  const validateForm = () => {
    if (!displayName.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name');
      return false;
    }

    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    if (!password) {
      Alert.alert('Validation Error', 'Please enter a password');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return false;
    }

    if (!role) {
      Alert.alert('Validation Error', 'Please select your account type');
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { data, error } = await signUp(email, password, displayName, role!, isInviteFlow);

      if (error) {
        Alert.alert('Registration Failed', error);
      } else {
        // If this is an invite flow, automatically claim the invite
        if (isInviteFlow && inviteParams?.inviteCode && data?.user) {
          try {
            const { providerId } = await directSupabase.claimInvite(inviteParams.inviteCode, data.user.id, email, displayName);

            // Wait a moment for auth state to update, then reload the user profile
            await new Promise(resolve => setTimeout(resolve, 1000));
            await reloadUserProfile(data.user.id);

            Alert.alert(
              'Welcome!',
              `Your account has been created and you've successfully joined ${inviteParams.inviterName}'s workspace!`,
              [{
                text: 'Continue',
                onPress: () => {
                  // Navigate directly to the service provider's workspace
                  navigation.reset({
                    index: 0,
                    routes: [{
                      name: 'ServiceProviderSummary',
                      params: {
                        providerId: providerId,
                        providerName: inviteParams.inviterName
                      }
                    }],
                  });
                }
              }]
            );
          } catch (inviteError) {
            // Still show success but mention they need to claim manually
            Alert.alert(
              'Account Created',
              'Your account has been created successfully! Please use your invite code again to join the workspace.',
              [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
          }
        } else {
          // Normal registration flow
          Alert.alert(
            'Account Created',
            'Your account has been created successfully! Please check your email to verify your account.',
            [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
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
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join TrackPay and start tracking your time</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Enter your full name"
                  placeholderTextColor={theme.colors.text.secondary}
                  autoComplete="name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor={theme.colors.text.secondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create a secure password"
                  placeholderTextColor={theme.colors.text.secondary}
                  secureTextEntry
                  autoComplete="password-new"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor={theme.colors.text.secondary}
                  secureTextEntry
                  autoComplete="password-new"
                />
              </View>

              {/* Role Selection - Show different UI for invite flows */}
              {isInviteFlow ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Account Type</Text>
                  <View style={styles.inviteRoleInfo}>
                    <Text style={styles.inviteRoleText}>
                      {role === 'client' ? '👤' : '👨‍💼'} {role === 'client' ? 'Client' : 'Service Provider'}
                    </Text>
                    <Text style={styles.inviteRoleDescription}>
                      You're joining as a {role} (invited by {inviteParams?.inviterName})
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Account Type</Text>
                  <View style={styles.roleSelection}>
                    <TouchableOpacity
                      style={[
                        styles.roleButton,
                        role === 'provider' && styles.roleButtonSelected,
                      ]}
                      onPress={() => setRole('provider')}
                    >
                      <Text style={styles.roleIcon}>👨‍💼</Text>
                      <Text
                        style={[
                          styles.roleButtonText,
                          role === 'provider' && styles.roleButtonTextSelected,
                        ]}
                      >
                        Service Provider
                      </Text>
                      <Text
                        style={[
                          styles.roleDescription,
                          role === 'provider' && styles.roleDescriptionSelected,
                        ]}
                      >
                        I provide services and track time for clients
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.roleButton,
                        role === 'client' && styles.roleButtonSelected,
                      ]}
                      onPress={() => setRole('client')}
                    >
                      <Text style={styles.roleIcon}>👤</Text>
                      <Text
                        style={[
                          styles.roleButtonText,
                          role === 'client' && styles.roleButtonTextSelected,
                        ]}
                      >
                        Client
                      </Text>
                      <Text
                        style={[
                          styles.roleDescription,
                          role === 'client' && styles.roleDescriptionSelected,
                        ]}
                      >
                        I hire service providers and view their work
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <Button
                title={isLoading ? "Creating Account..." : "Create Account"}
                onPress={handleSignUp}
                variant="primary"
                size="lg"
                disabled={isLoading}
                style={styles.signUpButton}
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  backButtonText: {
    fontSize: theme.fontSize.headline,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.display,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.input,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.body,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  roleSelection: {
    gap: theme.spacing.md,
  },
  roleButton: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  roleButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
  },
  roleIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },
  roleButtonText: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.xs,
  },
  roleButtonTextSelected: {
    color: theme.colors.primary,
  },
  roleDescription: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
  },
  roleDescriptionSelected: {
    color: theme.colors.primary,
  },
  signUpButton: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: theme.spacing.xl,
  },
  footerText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  footerLink: {
    fontSize: theme.fontSize.body,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
    fontFamily: theme.typography.fontFamily.primary,
  },
  inviteRoleInfo: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  inviteRoleText: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.sm,
  },
  inviteRoleDescription: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
  },
});