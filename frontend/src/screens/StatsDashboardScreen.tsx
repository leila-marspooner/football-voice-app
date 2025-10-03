import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getPlayerStats, PlayerStats } from '../services/ApiClient';

type StatsDashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'StatsDashboard'>;
type StatsDashboardScreenRouteProp = RouteProp<RootStackParamList, 'StatsDashboard'>;

interface StatsDashboardScreenProps {
  navigation: StatsDashboardScreenNavigationProp;
  route: StatsDashboardScreenRouteProp;
}

const StatsDashboardScreen: React.FC<StatsDashboardScreenProps> = ({ navigation, route }) => {
  const playerIds = route.params.playerIds || [1, 2, 3]; // Default player IDs for demo
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayerStats();
  }, [playerIds]);

  const fetchPlayerStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const statsPromises = playerIds.map(playerId => getPlayerStats(playerId));
      const statsResults = await Promise.all(statsPromises);
      
      setPlayerStats(statsResults);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch player stats';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      console.error('Error fetching player stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to safely format stats
  const formatStat = (value: number | undefined, isPercentage: boolean = false): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return isPercentage ? 'N/A' : '0';
    }
    return isPercentage ? `${value.toFixed(1)}%` : value.toString();
  };

  const renderStatCard = ({ item }: { item: PlayerStats }) => (
    <View style={styles.playerCard}>
      <Text style={styles.playerName}>{item.player_name}</Text>
      
      {/* Attacking Stats */}
      <View style={styles.statSection}>
        <Text style={styles.sectionTitle}>Attacking</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Goals:</Text>
          <Text style={styles.statValue}>{formatStat(item.goals)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Assists:</Text>
          <Text style={styles.statValue}>{formatStat(item.assists)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Shots on Target:</Text>
          <Text style={styles.statValue}>{formatStat(item.shots_on_target)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Shot Accuracy:</Text>
          <Text style={styles.statValue}>{formatStat(item.shot_accuracy, true)}</Text>
        </View>
      </View>

      {/* Passing Stats */}
      <View style={styles.statSection}>
        <Text style={styles.sectionTitle}>Passing</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Passes Completed:</Text>
          <Text style={styles.statValue}>{formatStat(item.passes_completed)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Pass Accuracy:</Text>
          <Text style={styles.statValue}>{formatStat(item.pass_accuracy, true)}</Text>
        </View>
      </View>

      {/* Defensive Stats */}
      <View style={styles.statSection}>
        <Text style={styles.sectionTitle}>Defensive</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Tackles:</Text>
          <Text style={styles.statValue}>{formatStat(item.tackles)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Duels Won:</Text>
          <Text style={styles.statValue}>{formatStat(item.duels_won)}/{formatStat(item.duels_total)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Duel Win Rate:</Text>
          <Text style={styles.statValue}>{formatStat(item.duel_win_rate, true)}</Text>
        </View>
      </View>

      {/* Discipline & Playing Time */}
      <View style={styles.statSection}>
        <Text style={styles.sectionTitle}>Discipline & Time</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Yellow Cards:</Text>
          <Text style={styles.statValue}>{formatStat(item.yellow_cards)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Red Cards:</Text>
          <Text style={styles.statValue}>{formatStat(item.red_cards)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Matches Played:</Text>
          <Text style={styles.statValue}>{formatStat(item.matches_played)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Minutes Played:</Text>
          <Text style={styles.statValue}>{formatStat(item.minutes_played)}</Text>
        </View>
      </View>
    </View>
  );

  const renderSinglePlayer = (stats: PlayerStats) => (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {renderStatCard({ item: stats })}
    </ScrollView>
  );

  const renderMultiplePlayers = () => (
    <View style={styles.container}>
      <FlatList
        data={playerStats}
        renderItem={renderStatCard}
        keyExtractor={(item) => item.player_id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading player stats...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchPlayerStats}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (playerStats.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No player stats available</Text>
      </View>
    );
  }

  // Use ScrollView for single player, FlatList for multiple players
  return playerStats.length === 1 ? renderSinglePlayer(playerStats[0]) : renderMultiplePlayers();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  scrollContent: {
    padding: 16,
  },
  listContent: {
    padding: 16,
  },
  playerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  playerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  statSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingBottom: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 60,
    textAlign: 'right',
  },
});

export default StatsDashboardScreen;
