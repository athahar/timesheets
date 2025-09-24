import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { theme } from '../styles/theme';
import { StickyCTA } from './StickyCTA';
import { IOSHeader } from './IOSHeader';
import { addClient } from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';
import { directSupabase } from '../services/storageService';
import { simpleT } from '../i18n/simple';

interface AddClientModalProps {
  visible: boolean;
  onClose: () => void;
  onClientAdded: () => void;
}

export const AddClientModal = React.memo<AddClientModalProps>(({
  visible,
  onClose,
  onClientAdded,
}) => {
  const { userProfile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [loading, setLoading] = useState(false);

  // Focus management refs
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const rateRef = useRef<TextInput>(null);

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert(simpleT('addClient.errorTitle'), simpleT('addClient.nameRequired'));
      return false;
    }

    // Email validation (optional but if provided, must be valid)
    if (email.trim() && !isValidEmail(email.trim())) {
      Alert.alert(simpleT('addClient.errorTitle'), simpleT('validation.emailInvalid'));
      return false;
    }

    const rate = parseFloat(hourlyRate);
    if (!hourlyRate || isNaN(rate) || rate <= 0) {
      Alert.alert(simpleT('addClient.errorTitle'), simpleT('addClient.rateInvalid'));
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
      Alert.alert(simpleT('addClient.errorTitle'), 'User profile not found. Please try again.');
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
      if (__DEV__) {
        if (__DEV__) {
          if (__DEV__) console.log('✅ Client created with invite:', newClient);
        }
      }

      // Reset form
      setName('');
      setEmail('');
      setHourlyRate('');

      // Close modal and refresh parent
      onClose();
      onClientAdded();

      if (newClient.inviteCode) {
        Alert.alert(simpleT('toast.success'), simpleT('addClient.successWithInvite', { clientName: trimmedName, inviteCode: newClient.inviteCode }));
      } else {
        Alert.alert(simpleT('toast.success'), simpleT('addClient.successMessage', { clientName: trimmedName }));
      }
    } catch (error) {
      console.error('Error adding client:', error);
      Alert.alert(simpleT('addClient.errorTitle'), simpleT('addClient.addError'));
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

  const isFormValid = name.trim() && hourlyRate && !isNaN(parseFloat(hourlyRate)) && parseFloat(hourlyRate) > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        <IOSHeader
          title={simpleT('addClient.title')}
          leftAction={{
            title: simpleT('addClient.cancel'),
            onPress: handleCancel,
          }}
          backgroundColor={theme.color.cardBg}
          largeTitleStyle="never"
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          <View style={styles.formSection}>
            <Text style={styles.label}>{simpleT('addClient.clientName')}</Text>
            <TextInput
              ref={nameRef}
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={simpleT('addClient.namePlaceholder')}
              placeholderTextColor={theme.color.textSecondary}
              autoFocus
              maxLength={50}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>{simpleT('addClient.emailOptional')}</Text>
            <TextInput
              ref={emailRef}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={simpleT('addClient.emailPlaceholder')}
              placeholderTextColor={theme.color.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={100}
              returnKeyType="next"
              onSubmitEditing={() => rateRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>{simpleT('addClient.hourlyRate')}</Text>
            <View style={styles.rateInputContainer}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                ref={rateRef}
                style={styles.rateInput}
                value={hourlyRate}
                onChangeText={setHourlyRate}
                placeholder={simpleT('addClient.ratePlaceholder')}
                placeholderTextColor={theme.color.textSecondary}
                keyboardType="decimal-pad"
                maxLength={10}
                returnKeyType="done"
                onSubmitEditing={isFormValid ? handleSave : undefined}
              />
              <Text style={styles.perHour}>{simpleT('addClient.perHour')}</Text>
            </View>
          </View>
        </ScrollView>

        <StickyCTA
          primaryButton={{
            title: loading ? simpleT('addClient.adding') : simpleT('addClient.addClient'),
            onPress: handleSave,
            disabled: !isFormValid,
            loading,
          }}
          backgroundColor={theme.color.cardBg}
        />
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.cardBg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.text,
    marginBottom: 8,
    fontFamily: theme.typography.fontFamily.primary,
  },
  input: {
    backgroundColor: theme.color.cardBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    borderWidth: 1,
    borderColor: theme.color.border,
    minHeight: 44,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.cardBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.color.border,
    minHeight: 44,
  },
  dollarSign: {
    fontSize: 16,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  rateInput: {
    flex: 1,
    fontSize: 16,
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    marginLeft: 4,
  },
  perHour: {
    fontSize: 16,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
});