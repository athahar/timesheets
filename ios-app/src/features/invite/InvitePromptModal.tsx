// Invite Prompt Modal Component
// Shows after session stop or before payment request for unclaimed clients
// User chooses: "Share Invite" (opens native share) or "Close" (skip)

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { TP } from '../../styles/themeV2';
import { simpleT } from '../../i18n/simple';

interface InvitePromptModalProps {
  visible: boolean;
  onClose: () => void;
  onShare: () => Promise<void>;
  title?: string;
  message?: string;
  sharing?: boolean;
}

export const InvitePromptModal: React.FC<InvitePromptModalProps> = ({
  visible,
  onClose,
  onShare,
  title = 'Session stopped',
  message = 'Share your hours and invite your client to connect.',
  sharing = false,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onShare}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>{simpleT('inviteModal.shareInvite')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onClose}
              disabled={sharing}
            >
              <Text style={styles.secondaryButtonText}>{simpleT('inviteModal.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: TP.spacing.x24,
  },
  card: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.card,
    padding: TP.spacing.x24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: TP.font.title,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
    marginBottom: TP.spacing.x12,
  },
  message: {
    fontSize: TP.font.body,
    color: TP.color.textSecondary,
    lineHeight: 22,
    marginBottom: TP.spacing.x24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    flex: 1,
    paddingVertical: TP.spacing.x12,
    paddingHorizontal: TP.spacing.x16,
    borderRadius: TP.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#000000',
    marginRight: TP.spacing.x8,
  },
  primaryButtonText: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: TP.color.divider,
    marginLeft: TP.spacing.x8,
  },
  secondaryButtonText: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
  },
});
