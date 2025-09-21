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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Client } from '../types';
import { Button } from '../components/Button';
import {
  getClients,
  addClient,
  getClientSummary,
} from '../services/storage';

interface ClientListScreenProps {
  navigation: any;
}

interface ClientWithSummary extends Client {
  unpaidHours: number;
  unpaidBalance: number;
}

export const ClientListScreen: React.FC<ClientListScreenProps> = ({ navigation }) => {
  const [clients, setClients] = useState<ClientWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientRate, setNewClientRate] = useState('');

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
          };
        })
      );
      setClients(clientsWithSummary);
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
    navigation.navigate('SessionTracking', { clientId: client.id });
  };

  const renderClientCard = ({ item }: { item: ClientWithSummary }) => (
    <TouchableOpacity
      onPress={() => handleClientPress(item)}
      className="bg-card rounded-card shadow-card p-6 mb-4"
    >
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1">
          <Text className="text-headline font-semibold text-text-primary mb-1">
            {item.name}
          </Text>
          <Text className="text-callout text-text-secondary">
            ${item.hourlyRate}/hour
          </Text>
        </View>

        <View className="items-end">
          {item.unpaidBalance > 0 ? (
            <Text className="text-title font-bold text-warning">
              ${item.unpaidBalance.toFixed(0)}
            </Text>
          ) : (
            <Text className="text-callout font-medium text-success">
              Paid up
            </Text>
          )}
        </View>
      </View>

      {item.unpaidHours > 0 && (
        <View className="bg-warning/10 rounded-lg p-3">
          <Text className="text-warning text-footnote font-medium">
            {item.unpaidHours.toFixed(1)} unpaid hours
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const totalUnpaid = clients.reduce((sum, client) => sum + client.unpaidBalance, 0);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 pt-6 pb-4">
        <Text className="text-display font-bold text-text-primary mb-6">Clients</Text>

        {totalUnpaid > 0 && (
          <View className="bg-warning/10 border border-warning/20 rounded-card p-4 mb-6">
            <Text className="text-callout text-text-secondary mb-1">
              Total Outstanding
            </Text>
            <Text className="text-title font-bold text-warning">
              ${totalUnpaid.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* Client List */}
      <FlatList
        data={clients}
        renderItem={renderClientCard}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={{ padding: 24, paddingTop: 0 }}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-body text-text-secondary mb-4">No clients yet</Text>
            <Text className="text-callout text-text-secondary text-center">
              Add your first client to start tracking time
            </Text>
          </View>
        }
        ListFooterComponent={
          <View className="mt-6">
            <Button
              title="Add New Client"
              onPress={() => setShowAddModal(true)}
              variant="primary"
              size="lg"
              className="w-full"
            />
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Add Client Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-1 px-6 pt-6">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-title font-bold text-text-primary">Add New Client</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                className="px-4 py-2"
              >
                <Text className="text-primary text-headline font-medium">Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View className="space-y-6">
              <View>
                <Text className="text-callout font-medium text-text-primary mb-3">
                  Client Name
                </Text>
                <View className="bg-card rounded-button border border-gray-200">
                  <TextInput
                    value={newClientName}
                    onChangeText={setNewClientName}
                    placeholder="Enter client name"
                    placeholderTextColor="#86868B"
                    className="px-4 py-4 text-body text-text-primary"
                    autoCapitalize="words"
                    style={{ fontFamily: '-apple-system' }}
                  />
                </View>
              </View>

              <View>
                <Text className="text-callout font-medium text-text-primary mb-3">
                  Hourly Rate
                </Text>
                <View className="bg-card rounded-button border border-gray-200">
                  <View className="flex-row items-center">
                    <Text className="text-body text-text-secondary pl-4">$</Text>
                    <TextInput
                      value={newClientRate}
                      onChangeText={setNewClientRate}
                      placeholder="45"
                      placeholderTextColor="#86868B"
                      keyboardType="numeric"
                      className="flex-1 px-2 py-4 text-body text-text-primary"
                      style={{ fontFamily: '-apple-system' }}
                    />
                    <Text className="text-body text-text-secondary pr-4">/hour</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Add Button */}
            <View className="mt-12">
              <Button
                title="Add Client"
                onPress={handleAddClient}
                variant="primary"
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