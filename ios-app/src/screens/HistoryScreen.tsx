import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Session, Client } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  getSessions,
  getClients,
} from '../services/storageService';

export const HistoryScreen: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [sessionsData, clientsData] = await Promise.all([
        getSessions(),
        getClients(),
      ]);

      // Sort sessions by start time (newest first)
      const sortedSessions = sessionsData.sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      setSessions(sortedSessions);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getClientById = (id: string) => {
    return clients.find(client => client.id === id) || null;
  };

  const calculateSummary = () => {
    const totalHours = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const totalEarned = sessions.reduce((sum, session) => sum + (session.amount || 0), 0);
    const paidSessions = sessions.filter(s => s.status === 'paid');
    const unpaidSessions = sessions.filter(s => s.status === 'unpaid');
    const paidAmount = paidSessions.reduce((sum, session) => sum + (session.amount || 0), 0);
    const unpaidAmount = unpaidSessions.reduce((sum, session) => sum + (session.amount || 0), 0);

    return {
      totalHours,
      totalEarned,
      paidAmount,
      unpaidAmount,
      paidSessionCount: paidSessions.length,
      unpaidSessionCount: unpaidSessions.length,
    };
  };

  const summary = calculateSummary();

  const renderSessionCard = ({ item }: { item: Session }) => {
    const client = getClientById(item.clientId);
    const isToday = new Date(item.startTime).toDateString() === new Date().toDateString();
    const isYesterday = new Date(item.startTime).toDateString() === new Date(Date.now() - 86400000).toDateString();

    const getDateLabel = () => {
      if (isToday) return 'Today';
      if (isYesterday) return 'Yesterday';
      return new Date(item.startTime).toLocaleDateString();
    };

    const getStatusBadge = () => {
      switch (item.status) {
        case 'paid':
          return (
            <View className="bg-success/10 border border-success/20 rounded-lg px-3 py-1">
              <Text className="text-success text-footnote font-medium">Paid</Text>
            </View>
          );
        case 'unpaid':
          return (
            <View className="bg-warning/10 border border-warning/20 rounded-lg px-3 py-1">
              <Text className="text-warning text-footnote font-medium">Unpaid</Text>
            </View>
          );
        case 'active':
          return (
            <View className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-1">
              <Text className="text-primary text-footnote font-medium">Active</Text>
            </View>
          );
        default:
          return null;
      }
    };

    return (
      <View className="bg-card rounded-card shadow-card p-6 mb-4">
        <View className="flex-row justify-between items-start mb-4">
          <Text className="text-headline font-semibold text-text-primary">{getDateLabel()}</Text>
          {getStatusBadge()}
        </View>

        <Text className="text-callout text-text-secondary mb-4">
          {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {item.endTime && ` - ${new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
        </Text>

        <View className="flex-row items-center space-x-6">
          <View className="flex-row items-center">
            <Text className="text-primary text-title font-bold mr-2">⏰</Text>
            <Text className="text-callout text-text-secondary">
              {item.duration ? `${item.duration.toFixed(0)}h ${((item.duration % 1) * 60).toFixed(0)}m` : 'Active'}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Text className="text-success text-title font-bold mr-2">$</Text>
            <Text className="text-callout font-semibold text-success">
              {formatCurrency(item.amount || 0)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 pt-6 pb-4">
        <Text className="text-display font-bold text-text-primary mb-6">History</Text>

        {/* Summary Cards Row */}
        <View className="flex-row space-x-4 mb-6">
          {/* Total Earned Card */}
          <View className="flex-1 bg-card rounded-card shadow-card p-6">
            <Text className="text-callout text-text-secondary mb-3">Total Earned</Text>
            <Text className="text-title font-bold text-success">
              {formatCurrency(summary.totalEarned)}
            </Text>
          </View>

          {/* Total Hours Card */}
          <View className="flex-1 bg-card rounded-card shadow-card p-6">
            <Text className="text-callout text-text-secondary mb-3">Total Hours</Text>
            <Text className="text-title font-bold text-primary">
              {(() => {
                const hours = Math.floor(summary.totalHours);
                const minutes = Math.round((summary.totalHours % 1) * 60);
                if (hours === 0) return `${minutes}min`;
                return minutes > 0 ? `${hours}hr ${minutes}min` : `${hours}hr`;
              })()}
            </Text>
          </View>
        </View>
      </View>

      {/* Sessions List */}
      <FlatList
        data={sessions}
        renderItem={renderSessionCard}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={{ padding: 24, paddingTop: 0 }}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-text-secondary text-body mb-4">{t('emptyState.noSessions')}</Text>
            <Text className="text-text-secondary text-callout text-center">
              {t('emptyState.firstSessionHint')}
            </Text>
          </View>
        }
        ListFooterComponent={
          sessions.length > 0 ? (
            <View className="bg-card rounded-card shadow-card p-6 mt-6">
              <Text className="text-headline font-semibold text-text-primary mb-4">
                Payment Summary
              </Text>

              <View className="space-y-4">
                <View className="flex-row justify-between items-center">
                  <Text className="text-callout text-text-secondary">Paid Sessions</Text>
                  <Text className="text-callout font-semibold text-success">
                    {summary.paidSessionCount} sessions • {formatCurrency(summary.paidAmount)}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-callout text-text-secondary">Unpaid Sessions</Text>
                  <Text className="text-callout font-semibold text-warning">
                    {summary.unpaidSessionCount} sessions • {formatCurrency(summary.unpaidAmount)}
                  </Text>
                </View>

                <View className="border-t border-gray-200 pt-4">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-headline font-semibold text-text-primary">Total</Text>
                    <Text className="text-headline font-bold text-text-primary">
                      {formatCurrency(summary.totalEarned)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};