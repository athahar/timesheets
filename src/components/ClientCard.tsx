import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Client } from '../types';

interface ClientCardProps {
  client: Client;
  unpaidHours: number;
  unpaidBalance: number;
  onPress: () => void;
}

export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  unpaidHours,
  unpaidBalance,
  onPress,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200"
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-semibold text-gray-900">{client.name}</Text>
        <Text className="text-sm text-gray-500">${client.hourlyRate}/hr</Text>
      </View>

      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <Text className="text-sm text-gray-600">
            {unpaidHours > 0 ? `${unpaidHours.toFixed(1)} unpaid hours` : 'No unpaid hours'}
          </Text>
        </View>

        <View className="items-end">
          {unpaidBalance > 0 ? (
            <Text className="text-lg font-bold text-unpaid">
              ${unpaidBalance.toFixed(2)}
            </Text>
          ) : (
            <Text className="text-lg font-bold text-paid">
              Paid up
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};