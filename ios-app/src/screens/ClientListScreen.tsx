import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  TextInput,
  Modal,
  Alert,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Keyboard,
  Appearance,
  ActionSheetIOS,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { Client } from '../types';
import { Button } from '../components/Button';
import { HowItWorksModal } from '../components/HowItWorksModal';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { TPTotalOutstandingCard } from '../components/v2/TPTotalOutstandingCard';
import { TPClientRow } from '../components/v2/TPClientRow';
import {
  getClients,
  addClient,
  getClientSummariesForClients,
  getActiveSessionsForClients,
  startSession,
  endSession,
  getActiveSession,
} from '../services/storageService';
import { theme } from '../styles/theme';

interface ClientListScreenProps {
  navigation: any;
}

interface ClientWithSummary extends Client {
  unpaidHours: number;
  unpaidBalance: number;
  totalHours: number;
  hasActiveSession: boolean;
  paymentStatus: 'unpaid' | 'requested' | 'paid';
}

interface ClientSection {
  title: string;
  data: ClientWithSummary[];
}

export const ClientListScreen: React.FC<ClientListScreenProps> = ({ navigation }) => {
  const [sections, setSections] = useState<ClientSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientRate, setNewClientRate] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [actioningClientId, setActioningClientId] = useState<string | null>(null);

  const { userProfile, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const loadClients = async () => {
    try {
      const clientsData = await getClients();
      const clientIds = clientsData.map(c => c.id);

      // Only 2 batch queries for ANY number of clients!
      const [summaries, activeSet] = await Promise.all([
        getClientSummariesForClients(clientIds),
        getActiveSessionsForClients(clientIds),
      ]);

      const sumById = new Map(summaries.map(s => [s.id, s]));

      const clientsWithSummary: ClientWithSummary[] = clientsData.map(c => {
        const summary = sumById.get(c.id) ?? { unpaidHours: 0, unpaidBalance: 0, totalHours: 0, paymentStatus: 'paid' as const };
        return {
          ...c,
          ...summary,
          hasActiveSession: activeSet.has(c.id),
        };
      });

      const byName = (a: ClientWithSummary, b: ClientWithSummary) => a.name.localeCompare(b.name);
      const active = clientsWithSummary.filter(c => c.hasActiveSession).sort(byName);
      const other = clientsWithSummary.filter(c => !c.hasActiveSession).sort(byName);

      const newSections: ClientSection[] = [];
      if (active.length > 0) newSections.push({ title: 'Active', data: active });
      if (other.length > 0) newSections.push({ title: 'Other Clients', data: other });

      setSections(newSections);
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

  // Keyboard listeners
  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

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
    navigation.navigate('ClientHistory', { clientId: client.id });
  };

  const handleSignOutConfirm = async () => {
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

  const handleGearPress = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Settings', 'Sign Out', 'Cancel'],
          cancelButtonIndex: 2,
          destructiveButtonIndex: 1,
          userInterfaceStyle: Appearance.getColorScheme() || 'light',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) navigation.navigate('Settings');
          if (buttonIndex === 1) handleSignOutConfirm();
        }
      );
    } else {
      Alert.alert('Account', 'Manage your settings or sign out', [
        { text: 'Settings', onPress: () => navigation.navigate('Settings') },
        { text: 'Sign Out', style: 'destructive', onPress: handleSignOutConfirm },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [navigation]);

  const handleAddClientPress = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowAddModal(true);
  }, []);

  const handleStartSession = useCallback(async (client: ClientWithSummary) => {
    if (actioningClientId) return; // Prevent double-tap

    try {
      setActioningClientId(client.id);
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      await startSession(client.id, 1); // Start with 1-person crew
      await loadClients(); // Reload to update UI
    } catch (error) {
      console.error('Error starting session:', error);
      Alert.alert('Error', 'Failed to start session');
    } finally {
      setActioningClientId(null);
    }
  }, [actioningClientId]);

  const handleStopSession = useCallback(async (client: ClientWithSummary) => {
    if (actioningClientId) return; // Prevent double-tap

    try {
      setActioningClientId(client.id);
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const activeSession = await getActiveSession(client.id);
      if (!activeSession) {
        Alert.alert('Error', 'No active session found');
        return;
      }

      await endSession(activeSession.id);
      await loadClients(); // Reload to update UI
    } catch (error) {
      console.error('Error stopping session:', error);
      Alert.alert('Error', 'Failed to stop session');
    } finally {
      setActioningClientId(null);
    }
  }, [actioningClientId]);

  const renderLeftActions = useCallback((item: ClientWithSummary) => {
    const isLoading = actioningClientId === item.id;
    const isActive = item.hasActiveSession;

    return (
      <TouchableOpacity
        style={[
          styles.swipeAction,
          isActive ? styles.swipeActionStop : styles.swipeActionStart
        ]}
        onPress={() => isActive ? handleStopSession(item) : handleStartSession(item)}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.swipeActionText}>
            {isActive ? '■ Stop' : '▶ Start'}
          </Text>
        )}
      </TouchableOpacity>
    );
  }, [actioningClientId, handleStartSession, handleStopSession]);

  const renderClientCard = useCallback(({ item }: { item: ClientWithSummary }) => {
    const clientForRow = {
      id: item.id,
      name: item.name,
      imageUri: undefined, // TODO: Add image support when available
      rate: item.hourlyRate,
      balance: item.unpaidBalance,
      hours: item.unpaidHours,
      status: (item.unpaidBalance > 0
        ? (item.paymentStatus === 'requested' ? 'requested' : 'due')
        : 'paid') as 'paid' | 'due' | 'requested',
    };

    return (
      <Swipeable
        renderLeftActions={() => renderLeftActions(item)}
        overshootLeft={false}
      >
        <View
          style={[
            item.hasActiveSession && styles.activeSessionIndicator
          ]}
        >
          <TPClientRow
            client={clientForRow}
            onPress={() => handleClientPress(item)}
            showDivider={false}
          />
        </View>
      </Swipeable>
    );
  }, [renderLeftActions]);

  const renderSectionHeader = useCallback(({ section }: { section: ClientSection }) => {
    if (section.title === 'Other Clients') {
      return (
        <View style={styles.sectionDivider}>
          <View style={styles.dividerLine} />
        </View>
      );
    }
    return null;
  }, []);

  const allClients = useMemo(() => sections.flatMap(s => s.data), [sections]);
  const totalUnpaid = useMemo(() => allClients.reduce((sum, client) => sum + client.unpaidBalance, 0), [allClients]);
  const totalHoursAcrossClients = useMemo(() => allClients.reduce((sum, client) => sum + client.totalHours, 0), [allClients]);
  const isZeroState = allClients.length === 0;
  const showOutstanding = !isZeroState && (allClients.length > 0 || totalUnpaid > 0);

  const renderHeader = () => (
    <View style={styles.header}>
      {/* User Info Row with Gear Icon */}
      <View style={styles.userInfoRow}>
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>Welcome!</Text>
          <Text style={styles.userName}>{userProfile?.name || userProfile?.email}</Text>
        </View>
        <TouchableOpacity
          onPress={handleGearPress}
          accessibilityRole="button"
          accessibilityLabel="Settings and account options"
          accessibilityHint="Opens menu to access settings or sign out"
          style={styles.headerIconButton}
          hitSlop={{ top: 6, left: 6, right: 6, bottom: 6 }}
        >
          <Feather name="settings" size={20} color={theme.color.text} />
        </TouchableOpacity>
      </View>

      {/* App Title */}
      <Text style={styles.headerTitle}>TrackPay</Text>

      {showOutstanding && (
        <TPTotalOutstandingCard
          amount={totalUnpaid}
          hours={totalHoursAcrossClients}
          showRequestButton={false}
        />
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.color.brand} />
        </View>
      ) : isZeroState ? (
        renderZeroState()
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderClientCard}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: 72 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      {!keyboardVisible && (
        <TouchableOpacity
          onPress={handleAddClientPress}
          style={[styles.fab, { bottom: 16 + Math.max(insets.bottom, 12) }]}
          accessibilityRole="button"
          accessibilityLabel="Add client"
          accessibilityHint="Opens form to add a new client"
          hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
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
  headerTitle: {
    fontSize: theme.font.large,
    fontWeight: '700',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.display,
    marginBottom: theme.space.x16,
  },

  // Active session indicator (for v2 client row)
  activeSessionIndicator: {
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E', // TP green for active session
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

  // Gear Icon Button
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section Divider
  sectionDivider: {
    paddingVertical: theme.space.x12,
  },
  dividerLine: {
    height: 1,
    backgroundColor: theme.color.border,
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.color.brand,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  // Swipe Actions
  swipeAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.space.x12,
    borderRadius: theme.radius.card,
  },
  swipeActionStart: {
    backgroundColor: '#10B981', // Green
  },
  swipeActionStop: {
    backgroundColor: '#EF4444', // Red
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: theme.font.body,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.primary,
  },
});