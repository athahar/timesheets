import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  SafeAreaView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { StickyCTA } from '../components/StickyCTA';
import { theme } from '../styles/theme';
import { directSupabase } from '../services/storageService';
import { validateInviteCodeFormat, extractInviteCode } from '../utils/inviteCodeGenerator';
import { useAuth } from '../contexts/AuthContext';

interface InviteClaimScreenProps {
  route?: {
    params?: {
      inviteCode?: string;
    };
  };
}

export const InviteClaimScreen: React.FC<InviteClaimScreenProps> = ({ route }) => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<any>(null);
  const [errors, setErrors] = useState<{inviteCode?: string}>({});

  // Pre-fill invite code if passed via deep link
  useEffect(() => {
    if (route?.params?.inviteCode) {
      const extractedCode = extractInviteCode(route.params.inviteCode);
      if (extractedCode) {
        setInviteCode(extractedCode);
        validateCode(extractedCode);
      }
    }
  }, [route?.params?.inviteCode]);

  const validateCode = async (code: string) => {
    if (!code.trim()) {
      setInviteDetails(null);
      return;
    }

    // First check format
    if (!validateInviteCodeFormat(code.trim().toUpperCase())) {
      setInviteDetails({ valid: false, message: 'Invalid invite code format' });
      return;
    }

    setValidating(true);
    try {
      const result = await directSupabase.validateInviteCode(code.trim().toUpperCase());
      setInviteDetails(result);
    } catch (error) {
      console.error('Error validating invite code:', error);
      setInviteDetails({ valid: false, message: 'Error validating invite code' });
    } finally {
      setValidating(false);
    }
  };

  const validateInviteCode = () => {
    const newErrors: {inviteCode?: string} = {};

    if (!inviteCode.trim()) {
      newErrors.inviteCode = 'Please enter an invite code';
    } else if (!inviteDetails?.valid || !inviteDetails.invite) {
      newErrors.inviteCode = 'Please enter a valid invite code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInviteCodeChange = (text: string) => {
    const uppercaseCode = text.toUpperCase();
    setInviteCode(uppercaseCode);

    // Clear errors when user starts typing
    if (errors.inviteCode) {
      setErrors(prev => ({ ...prev, inviteCode: undefined }));
    }

    // Auto-validate when code is 6-8 characters
    if (uppercaseCode.length >= 6 && uppercaseCode.length <= 8) {
      validateCode(uppercaseCode);
    } else {
      setInviteDetails(null);
    }
  };

  const handleClaimInvite = async () => {
    if (!validateInviteCode()) {
      return;
    }

    // If user is not logged in, proceed to registration with invite code
    if (!user) {
      navigation.navigate('Register' as never, {
        inviteCode: inviteCode.trim().toUpperCase(),
        inviterName: inviteDetails.invite.clientName,
        inviterRole: inviteDetails.invite.inviterRole,
        clientName: inviteDetails.invite.inviteeName // The person being invited
      } as never);
      return;
    }

    // If user is already logged in, claim the invite directly
    setLoading(true);
    try {
      const result = await directSupabase.claimInvite(inviteCode.trim().toUpperCase(), user.id);

      const successMessage = inviteDetails.invite.inviterRole === 'client'
        ? `You've accepted the work opportunity with ${inviteDetails.invite.clientName}`
        : `You've successfully joined ${inviteDetails.invite.clientName}'s workspace`;

      Alert.alert(
        'Success!',
        successMessage,
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigate to appropriate dashboard based on invite type
              navigation.reset({
                index: 0,
                routes: [{
                  name: 'ServiceProviderSummary',
                  params: {
                    providerId: result.providerId,
                    providerName: inviteDetails.invite.clientName
                  }
                }],
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error claiming invite:', error);
      Alert.alert('Error', 'Failed to claim invite. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
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
                <Text style={styles.title}>Claim Your Invite</Text>
              </View>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Invite Code</Text>
                <TextInput
                  style={[styles.codeInput, errors.inviteCode && styles.inputError]}
                  value={inviteCode}
                  onChangeText={handleInviteCodeChange}
                  placeholder="ABC123"
                  placeholderTextColor={theme.color.textSecondary}
                  maxLength={8}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoComplete="off"
                  textContentType="none"
                />
                {errors.inviteCode ? (
                  <Text style={styles.errorText}>{errors.inviteCode}</Text>
                ) : (
                  <Text style={styles.helperText}>
                    Enter the 6–8 character code from your provider
                  </Text>
                )}
              </View>

              {/* Validation Status */}
              {validating && (
                <Text style={styles.validatingText}>Validating code...</Text>
              )}

              {inviteDetails && !validating && (
                <View style={[
                  styles.validationResult,
                  inviteDetails.valid ? styles.validResult : styles.invalidResult
                ]}>
                  {inviteDetails.valid && inviteDetails.invite ? (
                    <View>
                      <Text style={styles.validText}>✓ Valid invite code</Text>
                      <Text style={styles.inviteDetailsText}>
                        {inviteDetails.invite.inviterRole === 'client'
                          ? `${inviteDetails.invite.clientName} wants to work with you`
                          : `Invited by ${inviteDetails.invite.clientName}`
                        }
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.invalidText}>
                      ✗ {inviteDetails.message || 'Invalid invite code'}
                    </Text>
                  )}
                </View>
              )}

            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Don't have an invite code? Ask your service provider.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky bottom CTA */}
      <StickyCTA
        primaryButton={{
          title: "Join Workspace",
          onPress: handleClaimInvite,
          disabled: !inviteDetails?.valid || loading,
          loading: loading,
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
  keyboardAvoidingView: {
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
  },

  // Form
  form: {
    flex: 1,
    paddingTop: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 8,
  },
  codeInput: {
    height: 56,
    backgroundColor: theme.color.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.color.border,
    paddingHorizontal: 16,
    fontSize: 20,
    fontFamily: 'Courier New',
    color: theme.color.text,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 8,
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
    textAlign: 'center',
  },
  helperText: {
    fontSize: 13,
    fontWeight: '400',
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
  },

  // Validation
  validatingText: {
    fontSize: 13,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  validationResult: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  validResult: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  invalidResult: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  validText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.color.brand,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 4,
  },
  invalidText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    fontFamily: theme.typography.fontFamily.primary,
  },
  inviteDetailsText: {
    fontSize: 13,
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
  },

  // Actions
  claimButton: {
    marginBottom: 20,
  },

  // Footer
  footer: {
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '400',
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
    lineHeight: 18,
  },
});