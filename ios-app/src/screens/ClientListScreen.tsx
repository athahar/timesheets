import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  KeyboardAvoidingView,
  ActivityIndicator,
  InputAccessoryView,
  Share,
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
import { formatCurrency, formatHours } from '../utils/formatters';
import { TPTotalOutstandingCard } from '../components/v2/TPTotalOutstandingCard';
import { TPClientRow } from '../components/v2/TPClientRow';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import ClientCardSkeleton from '../components/ClientCardSkeleton';
import { useClients } from '../hooks/useClients';
import { StickyActionBar, FOOTER_HEIGHT } from '../components/StickyActionBar';
import {
  addClient,
  getClientSummariesForClients,
  getActiveSessionsForClients,
  startSession,
  endSession,
  getActiveSession,
} from '../services/storageService';
import { theme } from '../styles/theme';
import { TP } from '../styles/themeV2';
import { simpleT } from '../i18n/simple';
// Analytics
import { capture, group, E, nowIso } from '../services/analytics';
// Invite Growth Loop
import { getOrCreateInviteCode } from '../features/invite/getOrCreateInviteCode';
import { buildHoursShare } from '../features/invite/inviteShare';
import { InvitePromptModal } from '../features/invite/InvitePromptModal';

const APP_NAME = process.env.EXPO_PUBLIC_APP_DISPLAY_NAME || 'TrackPay';

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
  titleKey: 'workInProgress' | 'myClients'; // Store key instead of translated string
  data: ClientWithSummary[];
}

export const ClientListScreen: React.FC<ClientListScreenProps> = ({ navigation }) => {
  const [sections, setSections] = useState<ClientSection[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientRate, setNewClientRate] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [actioningClientId, setActioningClientId] = useState<string | null>(null);
  const [, forceUpdate] = useState(0); // Force re-render for language changes
  const [sessionTimers, setSessionTimers] = useState<Record<string, number>>({}); // clientId -> elapsed hours
  const [buildingSections, setBuildingSections] = useState(false);
  const [timersLoaded, setTimersLoaded] = useState(false);
  const sectionListRef = useRef<SectionList>(null);

  // Invite Growth Loop modal state
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteSharing, setInviteSharing] = useState(false);
  const [invitePayload, setInvitePayload] = useState<{
    firstName: string;
    duration: string;
    code: string;
    link: string;
  } | null>(null);

  const { user, userProfile, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { toast, showSuccess, showError, hideToast } = useToast();

  // Use cached client fetching (stale-time pattern, 30s default)
  const { data: clientsData, loading, error: clientsError, refresh: refreshClients } = useClients(
    userProfile?.id || ''
  );

  // Build sections from clients data (runs when clients change)
  useEffect(() => {
    let cancelled = false;

    const buildSections = async () => {
      setBuildingSections(true);

      try {
        if (!clientsData || clientsData.length === 0) {
          if (!cancelled) setSections([]);
          return;
        }

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
        const inactive = clientsWithSummary.filter(c => !c.hasActiveSession).sort(byName);

        const newSections: ClientSection[] = [];
        if (active.length > 0) newSections.push({ titleKey: 'workInProgress', data: active });
        if (inactive.length > 0) newSections.push({ titleKey: 'myClients', data: inactive });

        if (!cancelled) setSections(newSections);
      } catch (error) {
        if (__DEV__) console.error('Error building client sections:', error);
      } finally {
        // CRITICAL: Always reset state even on error
        if (!cancelled) setBuildingSections(false);
      }
    };

    buildSections();

    return () => {
      cancelled = true;
    };
  }, [clientsData]);

  // On focus: force re-render for language changes
  // (useClients hook handles all fetch logic with stale-time caching)
  useFocusEffect(
    useCallback(() => {
      forceUpdate(prev => prev + 1);
    }, [])
  );

  // Timer for active sessions (updates every minute)
  useEffect(() => {
    let cancelled = false;

    const updateTimers = async () => {
      if (!clientsData) return;

      const timers: Record<string, number> = {};

      for (const client of clientsData) {
        const activeSession = await getActiveSession(client.id);
        if (activeSession) {
          const elapsedSeconds = (Date.now() - activeSession.startTime.getTime()) / 1000;
          const elapsedHours = elapsedSeconds / 3600;
          timers[client.id] = elapsedHours;
        }
      }

      if (!cancelled) {
        setSessionTimers(timers);
        setTimersLoaded(true);
      }
    };

    // Update immediately
    updateTimers();

    // Then update every minute (60000ms)
    const interval = setInterval(updateTimers, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [clientsData, sections]); // Re-run when clients or sections change

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshClients(); // Force fresh fetch from cache
    setRefreshing(false);
  };

  const handleAddClient = async () => {
    if (!newClientName.trim()) {
      Alert.alert(simpleT('common.error'), simpleT('clientList.errorClientName'));
      return;
    }

    const rate = parseFloat(newClientRate);
    if (!rate || rate <= 0) {
      Alert.alert(simpleT('common.error'), simpleT('clientList.errorHourlyRate'));
      return;
    }

    try {
      await addClient(newClientName.trim(), rate);
      setNewClientName('');
      setNewClientRate('');
      setShowAddModal(false);
      refreshClients();
    } catch (error) {
      console.error('Error adding client:', error);
      Alert.alert(simpleT('common.error'), simpleT('clientList.errorAddClient'));
    }
  };

  const handleClientPress = (client: Client) => {
    navigation.navigate('ClientHistory', { clientId: client.id });
  };

  const handleGearPress = useCallback(() => {
    navigation.navigate('Settings');
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

      // Analytics: Track session started
      try {
        if (user?.id) {
          group('provider', user.id);
          group('client', client.id);
        }

        capture(E.ACTION_SESSION_STARTED, {
          client_id: client.id,
          client_name: client.name || '',
          crew_size: 1,
          hourly_rate: client.hourlyRate || 0,
          start_time: nowIso(),
        });
      } catch (analyticsError) {
        if (__DEV__) {
          console.error('Analytics tracking failed:', analyticsError);
        }
      }

      // Silent refetch - no full-page spinner
      await refreshClients();

      // Show success toast
      showSuccess(simpleT('common.sessionStarted'));

      // Auto-scroll to Work In Progress section after reload completes
      setTimeout(() => {
        sectionListRef.current?.scrollToLocation({
          sectionIndex: 0,
          itemIndex: 0,
          animated: true,
          viewPosition: 0,
        });
      }, 100);
    } catch (error) {
      if (__DEV__) console.error('Error starting session:', error);
      showError(simpleT('clientList.errorStartSession'));
    } finally {
      setActioningClientId(null);
    }
  }, [actioningClientId, refreshClients, showSuccess, showError]);

  const handleStopSession = useCallback(async (client: ClientWithSummary) => {
    if (actioningClientId) return; // Prevent double-tap

    try {
      setActioningClientId(client.id);
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const activeSession = await getActiveSession(client.id);
      if (!activeSession) {
        showError(simpleT('clientList.errorNoActiveSession'));
        return;
      }

      // Calculate duration and metrics
      const durationSeconds = Math.floor((Date.now() - activeSession.startTime.getTime()) / 1000);
      const durationMinutes = Math.round(durationSeconds / 60);
      const durationHours = durationSeconds / 3600;
      const finalCrewSize = activeSession.crewSize || 1;
      const perPersonHours = durationHours;
      const totalPersonHours = perPersonHours * finalCrewSize;
      const totalAmount = totalPersonHours * (client.hourlyRate || 0);

      await endSession(activeSession.id);

      // Analytics: Track session stopped and completed
      try {
        if (user?.id) {
          group('provider', user.id);
          group('client', client.id);
        }

        const sessionStartTime = activeSession.startTime.toISOString();
        const sessionEndTime = nowIso();

        // Track action event (canonical Tier-0)
        capture(E.ACTION_SESSION_STOPPED, {
          session_id: activeSession.id,
          client_id: client.id,
          total_duration_minutes: durationMinutes,
          crew_size: finalCrewSize,
          person_hours: totalPersonHours,
          hourly_rate: client.hourlyRate || 0,
          total_amount: totalAmount,
        });

        // Track business event (canonical Tier-0)
        capture(E.BUSINESS_SESSION_COMPLETED, {
          session_id: activeSession.id,
          provider_id: user?.id || '',
          client_id: client.id,
          duration_minutes: durationMinutes,
          crew_size: finalCrewSize,
          person_hours: totalPersonHours,
          hourly_rate: client.hourlyRate || 0,
          total_amount: totalAmount,
          start_time: sessionStartTime,
          end_time: sessionEndTime,
        });
      } catch (analyticsError) {
        if (__DEV__) {
          console.error('Analytics tracking failed:', analyticsError);
        }
      }

      // Silent refetch - no full-page spinner
      await refreshClients();

      // Show success toast with duration
      showSuccess(`${simpleT('common.sessionEnded')} - ${formatHours(durationHours)}`);

      // Growth Loop: Show invite modal if client is unclaimed and feature flag is enabled
      if (process.env.EXPO_PUBLIC_FEATURE_INVITE_STOP === 'true') {
        if (client.claimedStatus === 'unclaimed') {
          try {
            // Format duration as HH:MM for invite message
            const hours = Math.floor(durationHours);
            const minutes = Math.round((durationHours - hours) * 60);
            const durationFormatted = `${hours}:${minutes.toString().padStart(2, '0')}`;

            // Get or create invite code
            const { code, link } = await getOrCreateInviteCode(client.id);

            // Prepare modal payload
            setInvitePayload({
              firstName: client.name.split(' ')[0],
              duration: durationFormatted,
              code,
              link
            });
            setInviteModalVisible(true);

            // Analytics: Track modal shown
            try {
              capture(E.INVITE_MODAL_SHOWN, {
                context: 'stop_session',
                client_id: client.id,
                client_claimed_status: client.claimedStatus,
              });
            } catch (analyticsError) {
              if (__DEV__) console.error('Analytics tracking failed:', analyticsError);
            }
          } catch (error) {
            // Non-blocking: session already ended
            if (__DEV__) {
              console.warn('Invite prep failed after session stop:', error);
            }
          }
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Error stopping session:', error);
      showError(simpleT('clientList.errorStopSession'));
    } finally{
      setActioningClientId(null);
    }
  }, [actioningClientId, refreshClients, showSuccess, showError]);

  const handleShareInvite = useCallback(async () => {
    if (!invitePayload) return;

    try {
      setInviteSharing(true);

      // Analytics: Track user chose to share
      try {
        capture(E.INVITE_MODAL_ACTION, {
          action: 'share',
          context: 'stop_session',
        });
      } catch (analyticsError) {
        if (__DEV__) console.error('Analytics tracking failed:', analyticsError);
      }

      const message = buildHoursShare(invitePayload);
      await Share.share({ message });

      // Analytics: Track share sheet opened
      try {
        capture(E.INVITE_SHARE_INITIATED, {
          channel: 'native_share',
          context: 'stop_session',
        });
      } catch (analyticsError) {
        if (__DEV__) console.error('Analytics tracking failed:', analyticsError);
      }

      setInviteModalVisible(false);
    } catch (error) {
      // User cancelled share or error occurred
      if (__DEV__) {
        console.warn('Share invite error:', error);
      }
      setInviteModalVisible(false);
    } finally {
      setInviteSharing(false);
    }
  }, [invitePayload]);

  const handleCloseInviteModal = useCallback(() => {
    // Analytics: Track user chose to skip
    try {
      capture(E.INVITE_MODAL_ACTION, {
        action: 'skip',
        context: 'stop_session',
      });
    } catch (analyticsError) {
      if (__DEV__) console.error('Analytics tracking failed:', analyticsError);
    }

    setInviteModalVisible(false);
  }, []);

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

    const isActive = item.hasActiveSession;
    const isLoading = actioningClientId === item.id;
    const elapsedHours = sessionTimers[item.id] || 0;

    // Gate timer display on timersLoaded to prevent "0min" flash
    const buttonLabel = isActive
      ? (timersLoaded
          ? `${simpleT('common.stop')} - ${formatHours(elapsedHours)}`
          : simpleT('common.stop'))
      : `▶ ${simpleT('common.start')}`;

    return (
      <View style={styles.clientCardWrapper}>
        <View style={styles.clientCard}>
          <TPClientRow
            client={clientForRow}
            onPress={() => handleClientPress(item)}
            showDivider={false}
            actionButton={{
              label: buttonLabel,
              variant: isActive ? 'stop' : 'start',
              loading: isLoading || (!timersLoaded && isActive), // Show loading until timers ready
              onPress: () => isActive ? handleStopSession(item) : handleStartSession(item),
            }}
            showStatusPill={false}
          />
        </View>
      </View>
    );
  }, [actioningClientId, handleStartSession, handleStopSession, handleClientPress, sessionTimers, timersLoaded]);

  const renderSectionHeader = useCallback(({ section }: { section: ClientSection }) => {
    const isMyClientsSection = section.titleKey === 'myClients';
    const titleText = section.titleKey === 'workInProgress'
      ? simpleT('clientList.workInProgress')
      : simpleT('clientList.myClients');

    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{titleText}</Text>
        {isMyClientsSection && (
          <TouchableOpacity onPress={handleAddClientPress} style={styles.addClientButton}>
            <Text style={styles.addClientButtonText}>{simpleT('clientList.addNewClient')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [handleAddClientPress]);

  const allClients = useMemo(() => sections.flatMap(s => s.data), [sections]);
  const totalUnpaid = useMemo(() => allClients.reduce((sum, client) => sum + client.unpaidBalance, 0), [allClients]);
  const totalHoursAcrossClients = useMemo(() => allClients.reduce((sum, client) => sum + client.totalHours, 0), [allClients]);
  const isZeroState = !loading && !buildingSections && allClients.length === 0;
  const showOutstanding = !isZeroState && (allClients.length > 0 || totalUnpaid > 0);

  const renderHeader = () => (
    <>
      {/* Top Navigation Bar with centered TrackPay */}
      <View style={styles.topNav}>
        <View style={styles.navSpacer} />
        <Text style={styles.navTitle}>{simpleT('common.appName')}</Text>
        <TouchableOpacity
          onPress={handleGearPress}
          accessibilityRole="button"
          accessibilityLabel="Settings and account options"
          accessibilityHint="Opens menu to access settings or sign out"
          style={styles.navIconButton}
          hitSlop={{ top: 6, left: 6, right: 6, bottom: 6 }}
        >
          <Feather name="settings" size={20} color={TP.color.ink} />
        </TouchableOpacity>
      </View>

      {showOutstanding && (
        <View style={styles.header}>
          <TPTotalOutstandingCard
            amount={totalUnpaid}
            hours={totalHoursAcrossClients}
            showRequestButton={false}
          />
        </View>
      )}
    </>
  );

  const renderZeroState = () => (
    <ScrollView
      style={styles.zeroStateContainer}
      contentContainerStyle={styles.zeroStateContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{simpleT('clientList.cta.title')}</Text>
        <Text style={styles.heroSubtitle}>
          {simpleT('clientList.cta.subtitle')}
        </Text>

        <View style={styles.heroActions}>
          <Button
            title={simpleT('clientList.cta.addClient')}
            onPress={() => setShowAddModal(true)}
            variant="primary"
            size="lg"
            style={styles.heroPrimaryButton}
          />

          <TouchableOpacity
            onPress={() => setShowHowItWorks(true)}
            style={styles.heroSecondaryButton}
          >
            <Text style={styles.heroSecondaryButtonText}>{simpleT('clientList.howItWorks')}</Text>
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
            <Text style={styles.stepTitle}>{simpleT('clientList.step1.title')}</Text>
            <Text style={styles.stepDescription}>{simpleT('clientList.step1.description')}</Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepIcon}>
            <Feather name="clock" size={28} color={theme.color.text} />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{simpleT('clientList.step2.title')}</Text>
            <Text style={styles.stepDescription}>
              {simpleT('clientList.step2.description')}
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepIcon}>
            <Feather name="send" size={28} color={theme.color.text} />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{simpleT('clientList.step3.title')}</Text>
            <Text style={styles.stepDescription}>
              {simpleT('clientList.step3.description')}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  // First load ever - show centered spinner
  if (loading && !clientsData) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.color.brand} />
        </View>
      </SafeAreaView>
    );
  }

  // Loading with cached data - show skeleton to prevent empty state flash
  const showSkeletonLoading = loading || buildingSections;

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      {isZeroState ? (
        renderZeroState()
      ) : showSkeletonLoading ? (
        <View style={styles.skeletonContainer}>
          <ClientCardSkeleton />
          <ClientCardSkeleton />
          <ClientCardSkeleton />
          <ClientCardSkeleton />
        </View>
      ) : (
        <SectionList
          ref={sectionListRef}
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

      {/* Add Client Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{simpleT('addClient.title')}</Text>
            <TouchableOpacity
              onPress={() => setShowAddModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>{simpleT('addClient.cancel')}</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Form */}
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{simpleT('addClient.clientName')}</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      value={newClientName}
                      onChangeText={setNewClientName}
                      placeholder={simpleT('addClient.namePlaceholder')}
                      placeholderTextColor={theme.color.textSecondary}
                      style={styles.input}
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => {
                        // Focus rate input when return is pressed
                      }}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{simpleT('addClient.hourlyRate')}</Text>
                  <View style={styles.inputContainer}>
                    <View style={styles.rateInputRow}>
                      <Text style={styles.ratePrefix}>$</Text>
                      <TextInput
                        value={newClientRate}
                        onChangeText={setNewClientRate}
                        placeholder={simpleT('addClient.ratePlaceholder')}
                        placeholderTextColor={theme.color.textSecondary}
                        keyboardType="decimal-pad"
                        style={styles.rateInput}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                      <Text style={styles.rateSuffix}>{simpleT('addClient.perHour')}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Sticky Action Bar - Glides up with keyboard */}
          <StickyActionBar>
            <Button
              title={simpleT('addClient.addClient')}
              onPress={handleAddClient}
              variant="primary"
              size="lg"
            />
          </StickyActionBar>
        </SafeAreaView>
      </Modal>

      {/* How It Works Modal */}
      <HowItWorksModal
        visible={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />

      {/* Invite Prompt Modal */}
      <InvitePromptModal
        visible={inviteModalVisible}
        sharing={inviteSharing}
        onShare={handleShareInvite}
        onClose={handleCloseInviteModal}
        title={simpleT('inviteModal.sessionStoppedTitle')}
        message={simpleT('inviteModal.shareHoursMessage', { firstName: invitePayload?.firstName ?? simpleT('clientList.errorTitle') })}
      />

      {/* Toast Notifications */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.appBg,
  },

  // Top Navigation Bar
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TP.spacing.x16,
    paddingVertical: TP.spacing.x12,
    backgroundColor: TP.color.appBg,
    borderBottomWidth: 1,
    borderBottomColor: TP.color.divider,
  },
  navSpacer: {
    width: 44, // Same width as icon button for symmetry
  },
  navTitle: {
    fontSize: TP.font.title3,
    fontWeight: TP.weight.bold,
    color: TP.color.ink,
  },
  navIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header Styles
  header: {
    paddingHorizontal: TP.spacing.x16,
    paddingTop: TP.spacing.x16,
    paddingBottom: TP.spacing.x16,
  },

  // Client card wrapper - matches header padding exactly
  clientCardWrapper: {
    marginHorizontal: TP.spacing.x16,
    marginBottom: TP.spacing.x12,
  },
  clientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: TP.radius.card,
    borderWidth: 1,
    borderColor: TP.color.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },

  // Section Header (with improved spacing)
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: TP.spacing.x16,
    backgroundColor: TP.color.appBg,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.semibold,
    color: TP.color.textSecondary,
    letterSpacing: 0.5,
  },
  addClientButton: {
    paddingVertical: TP.spacing.x6,
    paddingHorizontal: TP.spacing.x12,
  },
  addClientButtonText: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonContainer: {
    flex: 1,
    paddingTop: TP.spacing.x16,
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

  // List Content (when not zero state) - no horizontal padding, cards handle their own margins
  listContent: {
    paddingTop: 0,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.color.appBg,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  modalScrollView: {
    // Don't use flex: 1 - let it take only the content height
    // This allows modalFooter to be visible at the bottom
  },
  modalScrollContent: {
    paddingHorizontal: theme.space.x16,
    paddingBottom: 140, // Enough space for StickyActionBar (prevent inputs from hiding)
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.space.x16,
    paddingTop: theme.space.x16,
    paddingBottom: theme.space.x24,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
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
  // modalFooter and keyboard accessory styles removed - now using StickyActionBar component

  // Section Divider
  sectionDivider: {
    paddingVertical: theme.space.x12,
  },
  dividerLine: {
    height: 1,
    backgroundColor: theme.color.border,
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