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
} from 'react-native';
import { theme } from '../styles/theme';
import { Button } from './Button';
import { addClient } from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';
import { directSupabase } from '../services/storageService';

interface AddClientModalProps {
  visible: boolean;
  onClose: () => void;
  onClientAdded: () => void;
}

export const AddClientModal: React.FC<AddClientModalProps> = ({
  visible,
  onClose,
  onClientAdded,
}) => {
  const { userProfile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSave = async () => {
    if (!validateForm()) return;

    if (!userProfile) {
      Alert.alert('Error', 'User profile not found. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const rate = parseFloat(hourlyRate);
      const trimmedEmail = email.trim();
      const trimmedName = name.trim();

      // Create the client with invite code using directSupabase
      const newClient = await directSupabase.addClient(
        trimmedName,
        rate,
        trimmedEmail || undefined
      );
      console.log('✅ Client created with invite:', newClient);

      // Reset form
      setName('');
      setEmail('');
      setHourlyRate('');

      // Close modal and refresh parent
      onClose();
      onClientAdded();

      Alert.alert('Success', `${trimmedName} has been added as a client${newClient.inviteCode ? ` with invite code: ${newClient.inviteCode}` : ''}`);
    } catch (error) {
      console.error('Error adding client:', error);
      Alert.alert('Error', 'Failed to add client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setEmail('');
    setHourlyRate('');
    onClose();
  };

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
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add New Client</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
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
              title={loading ? "Adding..." : "Add Client"}
              onPress={handleSave}
              variant="primary"
              size="lg"
              disabled={loading}
              style={styles.saveButton}
            />
          </View>
        </View>
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
  title: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  placeholder: {
    width: 60, // Same as cancel button to center title
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
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
    borderRadius: theme.borderRadius.small,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.body,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    ...theme.shadows.card,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.small,
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
});