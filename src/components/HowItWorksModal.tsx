import React from 'react';
import {
  View,
  Text,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { Button } from './Button';

interface HowItWorksModalProps {
  visible: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({
  visible,
  onClose,
}) => {
  const steps = [
    {
      icon: 'user-plus' as const,
      title: 'Add a client',
      description: 'Name and hourly rate. That\'s it.',
    },
    {
      icon: 'clock' as const,
      title: 'Track hours',
      description: 'Start and stop sessions with precision timing.',
    },
    {
      icon: 'send' as const,
      title: 'Invite & request payment',
      description: 'Share your workspace, send requests, get notified when they confirm.',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>How it works</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.color.text} />
            </TouchableOpacity>
          </View>

          {/* Steps */}
          <View style={styles.stepsContainer}>
            {steps.map((step, index) => (
              <View key={index} style={styles.step}>
                <View style={styles.stepIconContainer}>
                  <Feather name={step.icon} size={28} color={theme.color.brand} />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title="Got it"
              onPress={onClose}
              variant="primary"
              size="lg"
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.appBg,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.space.x16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.space.x16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
    marginBottom: theme.space.x24,
  },
  title: {
    fontSize: theme.font.title,
    fontWeight: '700',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.display,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepsContainer: {
    flex: 1,
    paddingTop: theme.space.x16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.cardBg,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.space.x16,
    marginBottom: theme.space.x16,
    minHeight: 72,
  },
  stepIconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.space.x16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: theme.font.small,
    fontWeight: '400',
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 18,
  },
  footer: {
    paddingTop: theme.space.x24,
    paddingBottom: theme.space.x16,
  },
});