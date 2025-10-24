import React from 'react';
import {
  Modal,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { TPHeader } from './v2/TPHeader';
import { StickyCTA } from './StickyCTA';
import { TP } from '../styles/themeV2';
import { simpleT } from '../i18n/simple';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmStyle?: 'primary' | 'danger';
  loading?: boolean;
  loadingText?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmText,
  cancelText = simpleT('confirmation.cancel'),
  onConfirm,
  onCancel,
  confirmStyle = 'primary',
  loading = false,
  loadingText,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.container}>
        <TPHeader
          title={title}
          onBack={onCancel}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
        >
          <Text style={styles.message}>{message}</Text>
        </ScrollView>

        <StickyCTA
          primaryButton={{
            title: loading ? (loadingText || simpleT('confirmation.processing')) : confirmText,
            onPress: onConfirm,
            disabled: loading,
            loading,
          }}
          secondaryButton={{
            title: cancelText,
            onPress: onCancel,
            disabled: loading,
          }}
          backgroundColor={TP.color.appBg}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TP.color.appBg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: TP.spacing.x16,
    paddingTop: TP.spacing.x24,
    paddingBottom: TP.spacing.x32,
  },
  message: {
    fontSize: TP.font.body,
    color: TP.color.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
});
