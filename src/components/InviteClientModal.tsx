import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
  Share,
} from 'react-native';
import { theme } from '../styles/theme';
import { Button } from './Button';
import { directSupabase } from '../services/storageService';
import { generateInviteLink } from '../utils/inviteCodeGenerator';

interface InviteClientModalProps {
  visible: boolean;
  onClose: () => void;
  onClientAdded: () => void;
}

export const InviteClientModal: React.FC<InviteClientModalProps> = ({
  visible,
  onClose,
  onClientAdded,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'success'>('form');

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a client name');
      return false;
    }

    // Email validation (optional but if provided, must be valid)
    if (email.trim() && !isValidEmail(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    const rate = parseFloat(hourlyRate);
    if (!hourlyRate || isNaN(rate) || rate <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid hourly rate');
      return false;
    }

    return true;
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCreateInvite = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const rate = parseFloat(hourlyRate);
      const trimmedEmail = email.trim();
      const trimmedName = name.trim();

      // Create the client with invite (our new system!)
      const newClient = await directSupabase.addClient(
        trimmedName,
        rate,
        trimmedEmail || undefined
      );

      console.log('✅ Client and invite created:', newClient);

      if (newClient.inviteCode) {
        setInviteCode(newClient.inviteCode);
        setStep('success');
      } else {
        throw new Error('Invite code not generated');
      }

    } catch (error) {
      console.error('Error creating invite:', error);
      Alert.alert('Error', 'Failed to create invite. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInviteCode = async () => {
    if (inviteCode) {
      Clipboard.setString(inviteCode);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    }
  };

  const handleCopyInviteLink = async () => {
    if (inviteCode) {
      const deepLink = generateInviteLink(inviteCode, true);
      Clipboard.setString(deepLink);
      Alert.alert('Copied!', 'Invite link copied to clipboard');
    }
  };

  const handleShareInvite = async () => {
    if (inviteCode) {
      const deepLink = generateInviteLink(inviteCode, true);
      const webLink = generateInviteLink(inviteCode, false);

      try {
        await Share.share({
          title: 'TrackPay Invitation',
          message: `You've been invited to work with me on TrackPay!\n\nUse invite code: ${inviteCode}\n\nOr click this link: ${webLink}\n\nDownload TrackPay to get started!`,
          url: webLink, // iOS will use this
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const handleComplete = () => {
    // Reset form
    setName('');
    setEmail('');
    setHourlyRate('');
    setInviteCode(null);
    setStep('form');

    // Close modal and refresh parent
    onClose();
    onClientAdded();
  };

  const handleCancel = () => {
    setName('');
    setEmail('');
    setHourlyRate('');
    setInviteCode(null);
    setStep('form');
    onClose();
  };

  const renderFormStep = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Invite Client</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            Create an invite for your client. They'll receive a code to join TrackPay and start tracking time with you.
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Client Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter client name"
            placeholderTextColor={theme.colors.text.secondary}
            autoFocus
            maxLength={50}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Email (Optional)</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="client@example.com"
            placeholderTextColor={theme.colors.text.secondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={100}
          />
          <Text style={styles.helpText}>
            Email is optional. You can share the invite code directly.
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Hourly Rate</Text>
          <View style={styles.rateInputContainer}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.rateInput}
              value={hourlyRate}
              onChangeText={setHourlyRate}
              placeholder="0.00"
              placeholderTextColor={theme.colors.text.secondary}
              keyboardType="numeric"
              maxLength={10}
            />
            <Text style={styles.perHour}>/hour</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={loading ? "Creating Invite..." : "Create Invite"}
            onPress={handleCreateInvite}
            variant="primary"
            size="lg"
            disabled={loading}
            style={styles.saveButton}
          />
        </View>
      </View>
    </>
  );

  const renderSuccessStep = () => (
    <>
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text style={styles.title}>Invite Created!</Text>
        <TouchableOpacity onPress={handleComplete} style={styles.doneButton}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✅</Text>
          </View>

          <Text style={styles.successTitle}>
            {name} has been invited!
          </Text>

          <Text style={styles.successDescription}>
            Share this invite code with {name} to get started. The invite expires in 7 days.
          </Text>

          {/* Invite Code Display */}
          <View style={styles.inviteCodeContainer}>
            <Text style={styles.inviteCodeLabel}>Invite Code</Text>
            <View style={styles.inviteCodeBox}>
              <Text style={styles.inviteCodeText}>{inviteCode}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCopyInviteCode}
            >
              <Text style={styles.actionButtonText}>📋 Copy Code</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCopyInviteLink}
            >
              <Text style={styles.actionButtonText}>🔗 Copy Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={handleShareInvite}
            >
              <Text style={[styles.actionButtonText, styles.shareButtonText]}>
                📤 Share Invite
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>What happens next?</Text>
            <Text style={styles.instructionsText}>
              • {name} will receive the invite code{'\n'}
              • They'll download TrackPay and enter the code{'\n'}
              • You can start tracking time together immediately{'\n'}
              • You'll see them as "Claimed" once they join
            </Text>
          </View>
        </View>
      </View>
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {step === 'form' ? renderFormStep() : renderSuccessStep()}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  cancelButton: {
    padding: theme.spacing.sm,
  },
  cancelButtonText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  doneButton: {
    padding: theme.spacing.sm,
  },
  doneButtonText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
    fontFamily: theme.typography.fontFamily.primary,
  },
  title: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  descriptionContainer: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.sm,
  },
  description: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.primary,
  },
  formSection: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.primary,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.body,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    ...theme.shadows.card,
  },
  helpText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.primary,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    ...theme.shadows.card,
  },
  dollarSign: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  rateInput: {
    flex: 1,
    fontSize: theme.fontSize.body,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
    marginLeft: theme.spacing.xs,
  },
  perHour: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  buttonContainer: {
    marginTop: theme.spacing.xxl,
  },
  saveButton: {
    width: '100%',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  successIconText: {
    fontSize: 40,
  },
  successTitle: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.primary,
  },
  successDescription: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    fontFamily: theme.typography.fontFamily.primary,
  },
  inviteCodeContainer: {
    width: '100%',
    marginBottom: theme.spacing.xxl,
  },
  inviteCodeLabel: {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.primary,
  },
  inviteCodeBox: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  inviteCodeText: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    letterSpacing: 2,
    fontFamily: 'Courier New', // Monospace font for code
  },
  actionButtons: {
    width: '100%',
    marginBottom: theme.spacing.xxl,
  },
  actionButton: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E7',
    ...theme.shadows.card,
  },
  actionButtonText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.primary,
    fontWeight: theme.fontWeight.medium,
    fontFamily: theme.typography.fontFamily.primary,
  },
  shareButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  shareButtonText: {
    color: theme.colors.surface,
  },
  instructionsContainer: {
    width: '100%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  instructionsTitle: {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.primary,
  },
  instructionsText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    fontFamily: theme.typography.fontFamily.primary,
  },
});