import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Alert,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Client } from '../types';
import { Button } from '../components/Button';
import { theme } from '../styles/theme';
import { getClientById, updateClient } from '../services/storage';

interface ClientProfileScreenProps {
  route: {
    params: {
      clientId: string;
    };
  };
  navigation: any;
}

export const ClientProfileScreen: React.FC<ClientProfileScreenProps> = ({
  route,
  navigation,
}) => {
  const { clientId } = route.params;
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedRate, setEditedRate] = useState('');

  const loadData = async () => {
    try {
      const clientData = await getClientById(clientId);
      if (!clientData) {
        Alert.alert('Error', 'Client not found');
        navigation.goBack();
        return;
      }
      setClient(clientData);
      setEditedName(clientData.name);
      setEditedRate(clientData.hourlyRate.toString());
    } catch (error) {
      console.error('Error loading client:', error);
      Alert.alert('Error', 'Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [clientId])
  );

  const handleSave = async () => {
    if (!client) return;

    const rate = parseFloat(editedRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Invalid Rate', 'Please enter a valid hourly rate');
      return;
    }

    try {
      await updateClient(clientId, editedName.trim(), rate);
      const updatedClient = { ...client, name: editedName.trim(), hourlyRate: rate };
      setClient(updatedClient);
      setEditing(false);
      Alert.alert('Success', 'Client profile updated successfully');
    } catch (error) {
      console.error('Error updating client:', error);
      Alert.alert('Error', 'Failed to update client profile');
    }
  };

  const handleCancel = () => {
    if (!client) return;
    setEditedName(client.name);
    setEditedRate(client.hourlyRate.toString());
    setEditing(false);
  };

  if (loading || !client) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Client Profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Client Profile</Text>
        {!editing && (
          <TouchableOpacity
            onPress={() => setEditing(true)}
            style={styles.editButton}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.profileCard, theme.shadows.card]}>
          {editing ? (
            <>
              {/* Edit Mode */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Client Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Enter client name"
                  placeholderTextColor={theme.colors.text.secondary}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Hourly Rate</Text>
                <View style={styles.rateInputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.rateInput}
                    value={editedRate}
                    onChangeText={setEditedRate}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.text.secondary}
                    keyboardType="numeric"
                  />
                  <Text style={styles.rateUnit}>/hr</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsRow}>
                <Button
                  title="Cancel"
                  onPress={handleCancel}
                  variant="secondary"
                  size="md"
                  style={styles.actionButton}
                />
                <Button
                  title="Save Changes"
                  onPress={handleSave}
                  variant="primary"
                  size="md"
                  style={styles.actionButton}
                />
              </View>
            </>
          ) : (
            <>
              {/* View Mode */}
              <View style={styles.profileInfo}>
                <Text style={styles.clientName}>{client.name}</Text>
                <Text style={styles.clientRole}>Client</Text>
              </View>

              <View style={styles.rateSection}>
                <Text style={styles.rateLabel}>Hourly Rate</Text>
                <Text style={styles.rateValue}>${client.hourlyRate.toFixed(2)}/hr</Text>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoText}>
                  This is Lucy's current hourly rate for working with {client.name}.
                  The rate is used to calculate earnings for all work sessions.
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  backButton: {
    flex: 1,
  },
  backButtonText: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  headerTitle: {
    flex: 2,
    textAlign: 'center',
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.display,
  },
  editButton: {
    flex: 1,
    alignItems: 'flex-end',
  },
  editButtonText: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  profileCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.xl,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  clientName: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.display,
    marginBottom: theme.spacing.xs,
  },
  clientRole: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  rateSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.card,
  },
  rateLabel: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.sm,
  },
  rateValue: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
    fontFamily: theme.typography.fontFamily.primary,
  },
  infoSection: {
    marginTop: theme.spacing.lg,
  },
  infoText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 22,
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: theme.spacing.lg,
  },
  fieldLabel: {
    fontSize: theme.fontSize.footnote,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.input,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.body,
    fontFamily: theme.typography.fontFamily.primary,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.input,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
  },
  currencySymbol: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.typography.fontFamily.primary,
    color: theme.colors.text.primary,
    marginRight: theme.spacing.xs,
  },
  rateInput: {
    flex: 1,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.body,
    fontFamily: theme.typography.fontFamily.primary,
    color: theme.colors.text.primary,
  },
  rateUnit: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.typography.fontFamily.primary,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.xs,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  actionButton: {
    flex: 1,
  },
});