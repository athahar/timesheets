import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Modal,
  Alert,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { Client } from '../types';
import { Button } from '../components/Button';
import { HowItWorksModal } from '../components/HowItWorksModal';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/formatters';
import {
  getClients,
  addClient,
  getClientSummary,
} from '../services/storageService';
import { theme } from '../styles/theme';

interface ClientListScreenProps {
  navigation: any;
}

interface ClientWithSummary extends Client {
  unpaidHours: number;
  unpaidBalance: number;
  totalHours: number;
}

export const ClientListScreen: React.FC<ClientListScreenProps> = ({ navigation }) => {
  const [clients, setClients] = useState<ClientWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientRate, setNewClientRate] = useState('');

  const { userProfile, signOut } = useAuth();

  const loadClients = async () => {
    try {
      const clientsData = await getClients();
      const clientsWithSummary = await Promise.all(
        clientsData.map(async (client) => {
          const summary = await getClientSummary(client.id);
          return {
            ...client,
            unpaidHours: summary.unpaidHours,
            unpaidBalance: summary.unpaidBalance,
            totalHours: summary.totalHours,
          };
        })
      );

      // Sort alphabetically to ensure stable ordering
      const sortedClients = clientsWithSummary.sort((a, b) => a.name.localeCompare(b.name));
      setClients(sortedClients);
    } catch (error) {
      console.error('Error loading clients:', error);
      Alert.alert('Error', 'Failed to load clients');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadClients();
  };

  const handleAddClient = async () => {
    if (!newClientName.trim()) {
      Alert.alert('Error', 'Please enter a client name');
      return;
    }

    const rate = parseFloat(newClientRate);
    if (!rate || rate <= 0) {
      Alert.alert('Error', 'Please enter a valid hourly rate');
      return;
    }

    try {
      await addClient(newClientName.trim(), rate);
      setNewClientName('');
      setNewClientRate('');
      setShowAddModal(false);
      loadClients();
    } catch (error) {
      console.error('Error adding client:', error);
      Alert.alert('Error', 'Failed to add client');
    }
  };

  const handleClientPress = (client: Client) => {
    navigation.navigate('ClientProfile', { clientId: client.id });
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Error signing out:', error);
            }
          },
        },
      ]
    );
  };

  const renderClientCard = ({ item }: { item: ClientWithSummary }) => (
    <TouchableOpacity
      onPress={() => handleClientPress(item)}
      style={styles.clientCard}
    >
      <View style={styles.clientCardHeader}>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.name}</Text>
          <View style={styles.rateRow}>
            <Text style={styles.rateAmount}>${item.hourlyRate}</Text>
            <Text style={styles.rateLabel}>/hour</Text>
          </View>
        </View>

        <View style={styles.clientStatus}>
          {item.unpaidBalance > 0 ? (
            <View style={[styles.statusPill, styles.duePill]}>
              <Text style={[styles.statusPillText, styles.duePillText]}>
                {formatCurrency(item.unpaidBalance)}
              </Text>
            </View>
          ) : item.totalHours > 0 ? (
            <View style={[styles.statusPill, styles.paidPill]}>
              <Text style={[styles.statusPillText, styles.paidPillText]}>
                Paid up
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {item.unpaidHours > 0 && (
        <View style={styles.unpaidHoursCard}>
          <Text style={styles.unpaidHoursText}>
            ⏱️ {item.unpaidHours.toFixed(1)} unpaid hours
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const totalUnpaid = clients.reduce((sum, client) => sum + client.unpaidBalance, 0);
  const totalHoursAcrossClients = clients.reduce((sum, client) => sum + client.totalHours, 0);
  const isZeroState = clients.length === 0; // Restore proper zero-state logic
  const showOutstanding = !isZeroState && (clients.length > 0 || totalUnpaid > 0);

  const renderHeader = () => (
    <View style={styles.header}>
      {/* User Info and Logout Row */}
      <View style={styles.userInfoRow}>
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>Welcome!</Text>
          <Text style={styles.userName}>{userProfile?.name || userProfile?.email}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* App Title and Add Client Row */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>TrackPay</Text>
        {!isZeroState && (
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={styles.addClientButton}
          >
            <Feather name="plus" size={16} color={theme.color.brand} />
            <Text style={styles.addClientButtonText}>Add Client</Text>
          </TouchableOpacity>
        )}
      </View>

      {showOutstanding && (
        <View style={styles.outstandingCard}>
          <View style={styles.outstandingContent}>
            <Text style={styles.outstandingLabel}>Total Outstanding</Text>
            <View style={styles.outstandingRow}>
              <Text style={styles.outstandingAmount}>
                {formatCurrency(totalUnpaid)}
              </Text>
              {totalUnpaid > 0 ? (
                <View style={[styles.statusPill, styles.duePill]}>
                  <Text style={[styles.statusPillText, styles.duePillText]}>
                    Due {formatCurrency(totalUnpaid)}
                  </Text>
                </View>
              ) : totalHoursAcrossClients > 0 ? (
                <View style={[styles.statusPill, styles.paidPill]}>
                  <Text style={[styles.statusPillText, styles.paidPillText]}>
                    Paid up
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderZeroState = () => (
    <ScrollView
      style={styles.zeroStateContainer}
      contentContainerStyle={styles.zeroStateContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Let's set you up</Text>
        <Text style={styles.heroSubtitle}>
          Track hours, request payment, and invite clients to a shared workspace.
        </Text>

        <View style={styles.heroActions}>
          <Button
            title="Add Client"
            onPress={() => setShowAddModal(true)}
            variant="primary"
            size="lg"
            style={styles.heroPrimaryButton}
          />

          <TouchableOpacity
            onPress={() => setShowHowItWorks(true)}
            style={styles.heroSecondaryButton}
          >
            <Text style={styles.heroSecondaryButtonText}>How it works</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* How it works steps */}
      <View style={styles.stepsCard}>
        <View style={styles.step}>
          <View style={styles.stepIcon}>
            <Feather name="user-plus" size={28} color={theme.color.text} />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Add a client</Text>
            <Text style={styles.stepDescription}>Name and hourly rate. That's it.</Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepIcon}>
            <Feather name="clock" size={28} color={theme.color.text} />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Track hours</Text>
            <Text style={styles.stepDescription}>
              Start and stop sessions with precision timing.
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepIcon}>
            <Feather name="send" size={28} color={theme.color.text} />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Invite & request payment</Text>
            <Text style={styles.stepDescription}>
              Share your workspace, send requests, get notified when they confirm.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      {isZeroState ? (
        renderZeroState()
      ) : (
        <FlatList
          data={clients}
          renderItem={renderClientCard}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Client Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Client</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Client Name</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    value={newClientName}
                    onChangeText={setNewClientName}
                    placeholder="Enter client name"
                    placeholderTextColor={theme.color.textSecondary}
                    style={styles.input}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hourly Rate</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.rateInputRow}>
                    <Text style={styles.ratePrefix}>$</Text>
                    <TextInput
                      value={newClientRate}
                      onChangeText={setNewClientRate}
                      placeholder="45"
                      placeholderTextColor={theme.color.textSecondary}
                      keyboardType="numeric"
                      style={styles.rateInput}
                    />
                    <Text style={styles.rateSuffix}>/hour</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Add Button */}
            <View style={styles.modalFooter}>
              <Button
                title="Add Client"
                onPress={handleAddClient}
                variant="primary"
                size="lg"
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* How It Works Modal */}
      <HowItWorksModal
        visible={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.appBg,
  },

  // Header Styles
  header: {
    paddingHorizontal: theme.space.x16,
    paddingTop: theme.space.x16,
    paddingBottom: theme.space.x16,
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.space.x16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
    marginBottom: theme.space.x16,
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: theme.font.small,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  userName: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
  },
  logoutButton: {
    backgroundColor: theme.color.cardBg,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.color.border,
    paddingHorizontal: theme.space.x16,
    paddingVertical: theme.space.x8,
    minHeight: 44,
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: theme.font.body,
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: '500',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.space.x16,
  },
  headerTitle: {
    fontSize: theme.font.large,
    fontWeight: '700',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.display,
  },
  addClientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.cardBg,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.color.border,
    paddingHorizontal: theme.space.x12,
    paddingVertical: theme.space.x8,
    minHeight: 44,
  },
  addClientButtonText: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.brand,
    fontFamily: theme.typography.fontFamily.primary,
    marginLeft: theme.space.x4,
  },

  // Outstanding Card
  outstandingCard: {
    backgroundColor: theme.color.cardBg,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.space.x16,
  },
  outstandingContent: {
    flexDirection: 'column',
  },
  outstandingLabel: {
    fontSize: theme.font.body,
    fontWeight: '400',
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.space.x8,
  },
  outstandingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outstandingAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    fontVariant: ['tabular-nums'],
  },
  statusPill: {
    paddingHorizontal: theme.space.x12,
    paddingVertical: theme.space.x4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
  paidPill: {
    backgroundColor: theme.color.pillPaidBg,
    borderColor: theme.color.pillPaidBg,
  },
  duePill: {
    backgroundColor: theme.color.pillDueBg,
    borderColor: theme.color.pillDueBg,
  },
  statusPillText: {
    fontSize: theme.font.small,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.primary,
  },
  paidPillText: {
    color: theme.color.pillPaidText,
  },
  duePillText: {
    color: theme.color.pillDueText,
  },

  // Zero State
  zeroStateContainer: {
    flex: 1,
  },
  zeroStateContent: {
    paddingHorizontal: theme.space.x16,
    paddingBottom: theme.space.x32,
  },

  // Hero Card
  heroCard: {
    backgroundColor: theme.color.cardBg,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.space.x16,
    marginBottom: theme.space.x16,
  },
  heroTitle: {
    fontSize: theme.font.title,
    fontWeight: '700',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.display,
    marginBottom: theme.space.x8,
  },
  heroSubtitle: {
    fontSize: theme.font.body,
    fontWeight: '400',
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 22,
    marginBottom: theme.space.x24,
  },
  heroActions: {
    gap: theme.space.x12,
  },
  heroPrimaryButton: {
    height: 48,
  },
  heroSecondaryButton: {
    alignSelf: 'center',
    paddingVertical: theme.space.x12,
    minHeight: 44,
    justifyContent: 'center',
  },
  heroSecondaryButtonText: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.brand,
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
  },

  // Steps Card
  stepsCard: {
    backgroundColor: theme.color.cardBg,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.space.x16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.space.x8,
    minHeight: 72,
  },
  stepIcon: {
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
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: theme.font.small,
    fontWeight: '400',
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 18,
  },

  // List Content (when not zero state)
  listContent: {
    padding: theme.space.x16,
    paddingTop: 0,
  },

  // Client Card
  clientCard: {
    backgroundColor: theme.color.cardBg,
    borderRadius: theme.radius.card,
    padding: theme.space.x16,
    marginBottom: theme.space.x12,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  clientCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.space.x12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 4,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateAmount: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.money,
    fontFamily: theme.typography.fontFamily.primary,
  },
  rateLabel: {
    fontSize: theme.font.small,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    marginLeft: 4,
  },
  clientStatus: {
    alignItems: 'flex-end',
  },
  unpaidHoursCard: {
    backgroundColor: theme.color.pillDueBg,
    borderWidth: 1,
    borderColor: theme.color.pillDueBg,
    borderRadius: theme.space.x8,
    padding: theme.space.x12,
  },
  unpaidHoursText: {
    fontSize: theme.font.small,
    fontWeight: '600',
    color: theme.color.pillDueText,
    fontFamily: theme.typography.fontFamily.primary,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.color.appBg,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: theme.space.x16,
    paddingTop: theme.space.x16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.space.x32,
  },
  modalTitle: {
    fontSize: theme.font.title,
    fontWeight: '700',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.display,
  },
  modalCloseButton: {
    paddingHorizontal: theme.space.x16,
    paddingVertical: theme.space.x8,
    minHeight: 44,
    justifyContent: 'center',
  },
  modalCloseText: {
    color: theme.color.brand,
    fontSize: theme.font.body,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.primary,
  },

  // Form Styles
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: theme.space.x24,
  },
  inputLabel: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.space.x8,
  },
  inputContainer: {
    backgroundColor: theme.color.cardBg,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  input: {
    paddingHorizontal: theme.space.x16,
    paddingVertical: theme.space.x16,
    fontSize: theme.font.body,
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
  },
  rateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratePrefix: {
    fontSize: theme.font.body,
    color: theme.color.textSecondary,
    paddingLeft: theme.space.x16,
    fontFamily: theme.typography.fontFamily.primary,
  },
  rateInput: {
    flex: 1,
    paddingHorizontal: theme.space.x8,
    paddingVertical: theme.space.x16,
    fontSize: theme.font.body,
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
  },
  rateSuffix: {
    fontSize: theme.font.body,
    color: theme.color.textSecondary,
    paddingRight: theme.space.x16,
    fontFamily: theme.typography.fontFamily.primary,
  },
  modalFooter: {
    paddingTop: theme.space.x24,
    paddingBottom: theme.space.x16,
  },
});