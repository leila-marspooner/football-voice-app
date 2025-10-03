import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LiveMatchScreen from '../screens/LiveMatchScreen';
import PostMatchReviewScreen from '../screens/PostMatchReviewScreen';
import StatsDashboardScreen from '../screens/StatsDashboardScreen';

export type RootStackParamList = {
  LiveMatch: { matchId?: number };
  PostMatchReview: { matchId: number };
  StatsDashboard: { playerIds?: number[] };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="LiveMatch"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="LiveMatch"
        component={LiveMatchScreen}
        options={{
          title: 'Live Match Recording',
        }}
      />
      <Stack.Screen
        name="PostMatchReview"
        component={PostMatchReviewScreen}
        options={{
          title: 'Post-Match Review',
        }}
      />
      <Stack.Screen
        name="StatsDashboard"
        component={StatsDashboardScreen}
        options={{
          title: 'Stats Dashboard',
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
