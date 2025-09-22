import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ActivityItem, Client } from '../types';

interface ActivityFeedItemProps {
  activity: ActivityItem;
  client: Client | null;
}

export const ActivityFeedItem: React.FC<ActivityFeedItemProps> = ({ activity, client }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffDays = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return activityDate.toLocaleDateString();
  };

  const renderContent = () => {
    const time = formatTime(activity.timestamp);
    const clientName = client?.name || 'Unknown Client';


    switch (activity.type) {
      case 'session_start':
        return (
          <View className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
            <Text className="text-blue-800 font-medium">
              {clientName} started working
            </Text>
            <Text className="text-blue-600 text-sm mt-1">
              {time}
            </Text>
          </View>
        );

      case 'session_end':
        const { duration, amount } = activity.data;
        return (
          <View className="bg-green-50 border-l-4 border-green-400 p-3 rounded-r-lg">
            <Text className="text-green-800 font-medium">
              {clientName} finished working
            </Text>
            <Text className="text-green-700 mt-1">
              Session: {duration?.toFixed(1)} hours
            </Text>
            <Text className="text-green-700 font-semibold">
              Amount due: ${amount?.toFixed(2)}
            </Text>
            <Text className="text-green-600 text-sm mt-1">
              {time}
            </Text>
          </View>
        );

      case 'payment_request':
        const { amount: requestAmount } = activity.data;
        return (
          <View className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded-r-lg">
            <Text className="text-orange-800 font-medium">
              Payment request from {clientName}
            </Text>
            <Text className="text-orange-700 font-semibold">
              Amount: ${requestAmount?.toFixed(2)}
            </Text>
            <Text className="text-orange-600 text-sm mt-1">
              {time}
            </Text>
          </View>
        );

      case 'payment_completed':
        const {
          amount: paidAmount,
          method,
          paymentDate,
          sessionIds,
          sessionCount,
          description
        } = activity.data;

        return (
          <TouchableOpacity
            onPress={() => setIsExpanded(!isExpanded)}
            className="bg-emerald-50 border-l-4 border-emerald-400 p-3 rounded-r-lg"
          >
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="text-emerald-800 font-medium">
                  Payment completed
                </Text>
                <Text className="text-emerald-700 font-semibold">
                  ${paidAmount?.toFixed(2)} via {method}
                </Text>
                <Text className="text-emerald-600 text-sm mt-1">
                  {paymentDate ? formatDateTime(paymentDate) : time}
                </Text>
                {sessionCount && (
                  <Text className="text-emerald-600 text-sm">
                    {sessionCount} session{sessionCount > 1 ? 's' : ''} included
                  </Text>
                )}
              </View>
              <Text className="text-emerald-600 text-sm ml-2">
                {isExpanded ? '▼' : '▶'}
              </Text>
            </View>

            {isExpanded && sessionIds && sessionIds.length > 0 && (
              <View className="mt-3 pt-3 border-t border-emerald-200">
                <Text className="text-emerald-700 font-medium mb-2">
                  Sessions included in this payment:
                </Text>
                {sessionIds.map((sessionId: string, index: number) => (
                  <View key={sessionId} className="bg-emerald-100 p-2 rounded mb-1">
                    <Text className="text-emerald-800 text-sm font-mono">
                      Session #{index + 1}: {sessionId.substring(0, 8)}...
                    </Text>
                    <Text className="text-emerald-600 text-xs mt-1">
                      Tap to view session details
                    </Text>
                  </View>
                ))}
                {description && (
                  <Text className="text-emerald-600 text-sm mt-2 italic">
                    {description}
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        );

      default:
        return (
          <View className="bg-gray-50 border-l-4 border-gray-400 p-3 rounded-r-lg">
            <Text className="text-gray-800">Unknown activity</Text>
            <Text className="text-gray-600 text-sm mt-1">{time}</Text>
          </View>
        );
    }
  };

  return (
    <View className="mb-4">
      <Text className="text-xs text-gray-500 mb-2 ml-1">
        {formatDate(activity.timestamp)}
      </Text>
      {renderContent()}
    </View>
  );
};