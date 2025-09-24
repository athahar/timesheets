import React from 'react';
import { View, Text } from 'react-native';
import { Session, Client } from '../types';
import { simpleT } from '../i18n/simple';

interface SessionCardProps {
  session: Session;
  client: Client | null;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, client }) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-paid';
      case 'unpaid':
        return 'text-unpaid';
      case 'active':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-paid/10 border-paid/20';
      case 'unpaid':
        return 'bg-unpaid/10 border-unpaid/20';
      case 'active':
        return 'bg-blue-100 border-blue-200';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  };

  return (
    <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200">
      {/* Header */}
      <View className="flex-row justify-between items-start mb-3">
        <View>
          <Text className="text-lg font-semibold text-gray-900">
            {client?.name || simpleT('sessionCard.unknownClient')}
          </Text>
          <Text className="text-sm text-gray-500">
            {formatDate(session.startTime)}
          </Text>
        </View>
        <View className={`px-2 py-1 rounded border ${getStatusBadgeColor(session.status)}`}>
          <Text className={`text-xs font-medium capitalize ${getStatusColor(session.status)}`}>
            {session.status}
          </Text>
        </View>
      </View>

      {/* Time Details */}
      <View className="space-y-2">
        <View className="flex-row justify-between">
          <Text className="text-gray-600">{simpleT('sessionCard.startTime')}</Text>
          <Text className="text-gray-900">{formatTime(session.startTime)}</Text>
        </View>

        {session.endTime && (
          <View className="flex-row justify-between">
            <Text className="text-gray-600">{simpleT('sessionCard.endTime')}</Text>
            <Text className="text-gray-900">{formatTime(session.endTime)}</Text>
          </View>
        )}

        {session.duration !== undefined && (
          <View className="flex-row justify-between">
            <Text className="text-gray-600">{simpleT('sessionCard.duration')}</Text>
            <Text className="text-gray-900">{simpleT('sessionCard.durationHours', { hours: session.duration.toFixed(1) })}</Text>
          </View>
        )}

        <View className="flex-row justify-between">
          <Text className="text-gray-600">{simpleT('sessionCard.rate')}</Text>
          <Text className="text-gray-900">{simpleT('sessionCard.ratePerHour', { rate: session.hourlyRate })}</Text>
        </View>

        {session.amount !== undefined && (
          <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
            <Text className="text-gray-900 font-medium">{simpleT('sessionCard.amount')}</Text>
            <Text className={`text-lg font-bold ${getStatusColor(session.status)}`}>
              ${session.amount.toFixed(2)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};