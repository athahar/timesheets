import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityItem, Client, PaymentMethod } from '../types';
import { Button } from '../components/Button';
import {
  getActivities,
  getClients,
  markPaid,
  getSessionsByClient,
} from '../services/storage';

export const ClientViewScreen: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: 'cash', label: 'Cash' },
    { value: 'zelle', label: 'Zelle' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'other', label: 'Other' },
  ];

  const loadData = async () => {
    try {
      const [activitiesData, clientsData] = await Promise.all([
        getActivities(),
        getClients(),
      ]);

      setActivities(activitiesData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load activity feed');
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

  const handlePaymentRequest = (activity: ActivityItem) => {
    if (activity.type === 'payment_request') {
      setSelectedActivity(activity);
      setPaymentAmount(activity.data.amount?.toString() || '');
      setShowPaymentModal(true);
    }
  };

  const handleMarkPaid = async () => {
    if (!selectedActivity) return;

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }

    try {
      // Get unpaid sessions for this client
      const sessions = await getSessionsByClient(selectedActivity.clientId);
      const unpaidSessions = sessions.filter(session => session.status === 'unpaid');

      if (unpaidSessions.length === 0) {
        Alert.alert('Error', 'No unpaid sessions found');
        return;
      }

      await markPaid(
        selectedActivity.clientId,
        unpaidSessions.map(s => s.id),
        amount,
        paymentMethod
      );

      setShowPaymentModal(false);
      setSelectedActivity(null);
      setPaymentAmount('');
      loadData(); // Refresh data

      Alert.alert('Success', 'Payment marked as completed');
    } catch (error) {
      console.error('Error marking payment:', error);
      Alert.alert('Failed to mark payment as completed');
    }
  };

  const getClientById = (id: string) => {
    return clients.find(client => client.id === id) || null;
  };

  const renderActivityMessage = ({ item }: { item: ActivityItem }) => {
    const client = getClientById(item.clientId);
    const clientName = client?.name || 'Unknown Client';
    const time = new Date(item.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    const getActivityContent = () => {
      switch (item.type) {
        case 'session_start':
          return (
            <View className="bg-primary/10 border-l-4 border-primary rounded-r-card p-4 mr-12">
              <Text className="text-primary text-headline font-semibold mb-1">
                🟢 {clientName} started working
              </Text>
              <Text className="text-primary/70 text-footnote">
                {time}
              </Text>
            </View>
          );

        case 'session_end':
          const { duration, amount } = item.data;
          return (
            <View className="bg-success/10 border-l-4 border-success rounded-r-card p-4 mr-12">
              <Text className="text-success text-headline font-semibold mb-2">
                ⏹️ {clientName} finished working
              </Text>
              <Text className="text-success text-callout font-medium">
                {duration?.toFixed(1)} hours • ${amount?.toFixed(2)}
              </Text>
              <Text className="text-success/70 text-footnote mt-1">
                {time}
              </Text>
            </View>
          );

        case 'payment_request':
          const { amount: requestAmount } = item.data;
          return (
            <View className="bg-warning/10 border-l-4 border-warning rounded-r-card p-4 mr-12">
              <Text className="text-warning text-headline font-semibold mb-2">
                💰 Payment request from {clientName}
              </Text>
              <Text className="text-warning text-callout font-medium mb-3">
                Amount: ${requestAmount?.toFixed(2)}
              </Text>
              <Button
                title="Mark as Paid"
                onPress={() => handlePaymentRequest(item)}
                variant="success"
                size="sm"
                className="self-start"
              />
              <Text className="text-warning/70 text-footnote mt-2">
                {time}
              </Text>
            </View>
          );

        case 'payment_completed':
          const { amount: paidAmount, method } = item.data;
          return (
            <View className="bg-success/10 border-l-4 border-success rounded-r-card p-4 mr-12">
              <Text className="text-success text-headline font-semibold mb-2">
                ✅ Payment completed
              </Text>
              <Text className="text-success text-callout">
                ${paidAmount?.toFixed(2)} via {method}
              </Text>
              <Text className="text-success/70 text-footnote mt-1">
                {time}
              </Text>
            </View>
          );

        default:
          return (
            <View className="bg-gray-100 border-l-4 border-gray-400 rounded-r-card p-4 mr-12">
              <Text className="text-text-primary text-callout">Unknown activity</Text>
              <Text className="text-text-secondary text-footnote mt-1">{time}</Text>
            </View>
          );
      }
    };

    return (
      <View className="mb-4">
        {getActivityContent()}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 pt-6 pb-4">
        <Text className="text-display font-bold text-text-primary mb-2">Activity</Text>
        <Text className="text-callout text-text-secondary">
          Updates from your service provider
        </Text>
      </View>

      {/* Activity Feed */}
      <FlatList
        data={activities}
        renderItem={renderActivityMessage}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={{ padding: 24, paddingTop: 0 }}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-body text-text-secondary mb-4">No activity yet</Text>
            <Text className="text-callout text-text-secondary text-center">
              Activity will appear here when your service provider starts working
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-1 px-6 pt-6">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-title font-bold text-text-primary">Mark Payment</Text>
              <TouchableOpacity
                onPress={() => setShowPaymentModal(false)}
                className="px-4 py-2"
              >
                <Text className="text-primary text-headline font-medium">Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View className="space-y-6">
              {/* Amount */}
              <View>
                <Text className="text-callout font-medium text-text-primary mb-3">
                  Payment Amount
                </Text>
                <View className="bg-card rounded-button border border-gray-200">
                  <View className="flex-row items-center">
                    <Text className="text-body text-text-secondary pl-4">$</Text>
                    <TextInput
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
                      placeholder="Enter amount paid"
                      placeholderTextColor="#86868B"
                      keyboardType="numeric"
                      className="flex-1 px-2 py-4 text-body text-text-primary"
                      style={{ fontFamily: '-apple-system' }}
                    />
                  </View>
                </View>
                <Text className="text-footnote text-text-secondary mt-2">
                  You can enter a partial payment amount
                </Text>
              </View>

              {/* Payment Method */}
              <View>
                <Text className="text-callout font-medium text-text-primary mb-3">
                  Payment Method
                </Text>
                <View className="space-y-3">
                  {paymentMethods.map((method) => (
                    <TouchableOpacity
                      key={method.value}
                      onPress={() => setPaymentMethod(method.value)}
                      className={`bg-card rounded-button border-2 p-4 ${
                        paymentMethod === method.value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200'
                      }`}
                    >
                      <Text className={`text-callout font-medium ${
                        paymentMethod === method.value
                          ? 'text-primary'
                          : 'text-text-primary'
                      }`}>
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Mark as Paid Button */}
            <View className="mt-12">
              <Button
                title="Mark as Paid"
                onPress={handleMarkPaid}
                variant="success"
                size="lg"
                className="w-full"
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};