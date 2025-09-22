import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Clipboard,
  Share,
} from 'react-native';
import { theme } from '../styles/theme';
import { Button } from './Button';
import { generateInviteLink } from '../utils/inviteCodeGenerator';

interface InviteModalProps {
  visible: boolean;
  onClose: () => void;
  clientName: string;
  inviteCode: string;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  visible,
  onClose,
  clientName,
  inviteCode,
}) => {
  const handleCopyCode = () => {
    Clipboard.setString(inviteCode);
    Alert.alert('Copied!', 'Invite code copied to clipboard');
  };

  const handleCopyLink = () => {
    const link = generateInviteLink(inviteCode, false);
    Clipboard.setString(link);
    Alert.alert('Copied!', 'Invite link copied to clipboard');
  };

  const handleShare = async () => {
    const deepLink = generateInviteLink(inviteCode, true);
    const webLink = generateInviteLink(inviteCode, false);

    try {
      await Share.share({
        title: 'TrackPay Invitation',
        message: `You've been invited to work with me on TrackPay!\n\nUse invite code: ${inviteCode}\n\nOr click this link: ${webLink}\n\nDownload TrackPay to get started!`,
        url: webLink,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Invite {clientName}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.description}>
              Share this invite code with {clientName} to get started:
            </Text>

            {/* Invite Code */}
            <View style={styles.inviteCodeContainer}>
              <Text style={styles.inviteCodeText}>{inviteCode}</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Button
                title="Copy Code"
                onPress={handleCopyCode}
                variant="secondary"
                size="sm"
                style={styles.actionButton}
              />
              <Button
                title="Copy Link"
                onPress={handleCopyLink}
                variant="secondary"
                size="sm"
                style={styles.actionButton}
              />
            </View>

            <Button
              title="Share Invite"
              onPress={handleShare}
              variant="primary"
              size="md"
              style={styles.shareButton}
            />
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
    padding: theme.spacing.lg,
  },
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    width: '100%',
    maxWidth: 400,
    ...theme.shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  title: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  closeButtonText: {
    fontSize: theme.fontSize.headline,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  content: {
    padding: theme.spacing.lg,
  },
  description: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 22,
  },
  inviteCodeContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  inviteCodeText: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    letterSpacing: 2,
    fontFamily: 'Courier New',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  shareButton: {
    width: '100%',
  },
});