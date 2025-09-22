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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
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

  const handleInviteCodeChange = (text: string) => {
    const uppercaseCode = text.toUpperCase();
    setInviteCode(uppercaseCode);

    // Auto-validate when code is 8 characters
    if (uppercaseCode.length === 8) {
      validateCode(uppercaseCode);
    } else {
      setInviteDetails(null);
    }
  };

  const handleClaimInvite = async () => {

    if (!inviteDetails?.valid || !inviteDetails.invite) {
      Alert.alert('Error', 'Please enter a valid invite code first');
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
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Claim Your Invite</Text>
            <Text style={styles.subtitle}>
              Enter the invite code you received to access your work tracking account
            </Text>
          </View>

          {/* Invite Code Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Invite Code</Text>
            <TextInput
              style={styles.codeInput}
              value={inviteCode}
              onChangeText={handleInviteCodeChange}
              placeholder="ABC12XYZ"
              placeholderTextColor={theme.colors.text.secondary}
              maxLength={8}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
            />

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

          {/* Debug Info */}
          {__DEV__ && (
            <View style={{ marginBottom: 16, padding: 10, backgroundColor: '#f0f0f0' }}>
              <Text>Debug Info:</Text>
              <Text>User: {user ? 'Logged in' : 'Not logged in'}</Text>
              <Text>Valid: {inviteDetails?.valid ? 'Yes' : 'No'}</Text>
              <Text>Button disabled: {(!inviteDetails?.valid || loading) ? 'Yes' : 'No'}</Text>
            </View>
          )}

          {/* Action Button */}
          <Button
            title={
              inviteDetails?.invite?.inviterRole === 'client'
                ? "Accept Work Opportunity"
                : "Join Workspace"
            }
            onPress={() => {
              handleClaimInvite();
            }}
            disabled={!inviteDetails?.valid || loading}
            loading={loading}
            variant="primary"
            size="lg"
            style={styles.claimButton}
          />

          {/* Help Text */}
          <View style={styles.helpSection}>
            <Text style={styles.helpText}>
              Don't have an invite code? Contact your service provider to get one.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  title: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.display,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: theme.spacing.xxl,
  },
  inputLabel: {
    fontSize: theme.fontSize.footnote,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.sm,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.lg,
    fontSize: theme.fontSize.title,
    fontFamily: 'Courier New',
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.card,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: theme.fontWeight.bold,
  },
  validatingText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    fontStyle: 'italic',
  },
  validationResult: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
  },
  validResult: {
    backgroundColor: theme.colors.success + '20',
    borderWidth: 1,
    borderColor: theme.colors.success + '40',
  },
  invalidResult: {
    backgroundColor: theme.colors.error + '20',
    borderWidth: 1,
    borderColor: theme.colors.error + '40',
  },
  validText: {
    fontSize: theme.fontSize.footnote,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.success,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.xs,
  },
  invalidText: {
    fontSize: theme.fontSize.footnote,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.error,
    fontFamily: theme.typography.fontFamily.primary,
  },
  inviteDetailsText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.xs,
  },
  claimButton: {
    marginBottom: theme.spacing.xl,
  },
  helpSection: {
    alignItems: 'center',
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  helpText: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
    lineHeight: 20,
  },
});