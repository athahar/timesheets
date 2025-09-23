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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Client } from '../types';
import { Button } from '../components/Button';
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

  const renderClientCard = ({ item }: { item: ClientWithSummary }) => (
    <TouchableOpacity
      onPress={() => handleClientPress(item)}
      style={{
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.card,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
      }}
    >
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: theme.fontSize.headline,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.text.primary,
            marginBottom: 4,
          }}>
            {item.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{
              fontSize: theme.fontSize.body,
              fontWeight: theme.fontWeight.medium,
              color: theme.colors.money[500],
            }}>
              ${item.hourlyRate}
            </Text>
            <Text style={{
              fontSize: theme.fontSize.callout,
              color: theme.colors.text.secondary,
              marginLeft: 4,
            }}>
              /hour
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          {item.unpaidBalance > 0 ? (
            <View style={{
              backgroundColor: theme.colors.warning[50],
              borderWidth: 1,
              borderColor: theme.colors.warning[100],
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}>
              <Text style={{
                fontSize: theme.fontSize.callout,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.warning[600],
              }}>
                ${item.unpaidBalance.toFixed(0)}
              </Text>
            </View>
          ) : (
            <View style={{
              backgroundColor: theme.colors.money[50],
              borderWidth: 1,
              borderColor: theme.colors.money[100],
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}>
              <Text style={{
                fontSize: theme.fontSize.footnote,
                fontWeight: theme.fontWeight.medium,
                color: theme.colors.money[600],
              }}>
                Paid up
              </Text>
            </View>
          )}
        </View>
      </View>

      {item.unpaidHours > 0 && (
        <View style={{
          backgroundColor: theme.colors.warning[50],
          borderWidth: 1,
          borderColor: theme.colors.warning[100],
          borderRadius: 8,
          padding: 12,
        }}>
          <Text style={{
            fontSize: theme.fontSize.callout,
            fontWeight: theme.fontWeight.medium,
            color: theme.colors.warning[600],
          }}>
            ⏱️ {item.unpaidHours.toFixed(1)} unpaid hours
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const totalUnpaid = clients.reduce((sum, client) => sum + client.unpaidBalance, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
        }}>
          <Text style={{
            fontSize: 32,
            fontWeight: '700',
            color: theme.colors.text.primary,
            flex: 1,
          }}>
            Clients
          </Text>
          <View style={{
            backgroundColor: 'rgba(0, 122, 255, 0.15)',
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 16,
          }}>
            <Text style={{
              fontSize: theme.fontSize.footnote,
              fontWeight: theme.fontWeight.medium,
              color: theme.colors.primary,
            }}>
              {clients.length}
            </Text>
          </View>
        </View>

        {totalUnpaid > 0 && (
          <View style={{
            backgroundColor: theme.colors.warning[50],
            borderWidth: 1,
            borderColor: theme.colors.warning[100],
            borderRadius: theme.borderRadius.card,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: theme.fontSize.callout,
                  color: theme.colors.text.secondary,
                  marginBottom: 4,
                }}>
                  💰 Total Outstanding
                </Text>
                <Text style={{
                  fontSize: 24,
                  fontWeight: theme.fontWeight.bold,
                  color: theme.colors.warning[600],
                }}>
                  ${totalUnpaid.toFixed(2)}
                </Text>
              </View>
              <View style={{
                backgroundColor: theme.colors.warning[100],
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 18 }}>📊</Text>
              </View>
            </View>
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
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 80,
          }}>
            <Text style={{
              fontSize: theme.fontSize.body,
              color: theme.colors.text.secondary,
              marginBottom: 16,
            }}>
              No clients yet
            </Text>
            <Text style={{
              fontSize: theme.fontSize.callout,
              color: theme.colors.text.secondary,
              textAlign: 'center',
            }}>
              Add your first client to start tracking time
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={{ marginTop: 24 }}>
            <Button
              title="Add New Client"
              onPress={() => setShowAddModal(true)}
              variant="primary"
              size="lg"
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
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
            {/* Modal Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 32,
            }}>
              <Text style={{
                fontSize: theme.fontSize.title,
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.text.primary,
              }}>
                Add New Client
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={{ paddingHorizontal: 16, paddingVertical: 8 }}
              >
                <Text style={{
                  color: theme.colors.primary,
                  fontSize: theme.fontSize.headline,
                  fontWeight: theme.fontWeight.medium,
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View>
              <View style={{ marginBottom: 24 }}>
                <Text style={{
                  fontSize: theme.fontSize.callout,
                  fontWeight: theme.fontWeight.medium,
                  color: theme.colors.text.primary,
                  marginBottom: 12,
                }}>
                  Client Name
                </Text>
                <View style={{
                  backgroundColor: theme.colors.card,
                  borderRadius: theme.borderRadius.medium,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}>
                  <TextInput
                    value={newClientName}
                    onChangeText={setNewClientName}
                    placeholder="Enter client name"
                    placeholderTextColor="#86868B"
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 16,
                      fontSize: theme.fontSize.body,
                      color: theme.colors.text.primary,
                      fontFamily: '-apple-system',
                    }}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={{ marginBottom: 24 }}>
                <Text style={{
                  fontSize: theme.fontSize.callout,
                  fontWeight: theme.fontWeight.medium,
                  color: theme.colors.text.primary,
                  marginBottom: 12,
                }}>
                  Hourly Rate
                </Text>
                <View style={{
                  backgroundColor: theme.colors.card,
                  borderRadius: theme.borderRadius.medium,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{
                      fontSize: theme.fontSize.body,
                      color: theme.colors.text.secondary,
                      paddingLeft: 16,
                    }}>
                      $
                    </Text>
                    <TextInput
                      value={newClientRate}
                      onChangeText={setNewClientRate}
                      placeholder="45"
                      placeholderTextColor="#86868B"
                      keyboardType="numeric"
                      style={{
                        flex: 1,
                        paddingHorizontal: 8,
                        paddingVertical: 16,
                        fontSize: theme.fontSize.body,
                        color: theme.colors.text.primary,
                        fontFamily: '-apple-system',
                      }}
                    />
                    <Text style={{
                      fontSize: theme.fontSize.body,
                      color: theme.colors.text.secondary,
                      paddingRight: 16,
                    }}>
                      /hour
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Add Button */}
            <View style={{ marginTop: 48 }}>
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
    </SafeAreaView>
  );
};