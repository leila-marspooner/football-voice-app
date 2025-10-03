import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getMatch, deleteEvent, updateEvent, ParsedEvent, Match } from '../services/ApiClient';

type PostMatchReviewScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PostMatchReview'>;
type PostMatchReviewScreenRouteProp = RouteProp<RootStackParamList, 'PostMatchReview'>;

interface PostMatchReviewScreenProps {
  navigation: PostMatchReviewScreenNavigationProp;
  route: PostMatchReviewScreenRouteProp;
}

const PostMatchReviewScreen: React.FC<PostMatchReviewScreenProps> = ({ navigation, route }) => {
  const matchId = route.params.matchId;
  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editMinute, setEditMinute] = useState('');
  const [editPlayerId, setEditPlayerId] = useState('');

  useEffect(() => {
    fetchMatch();
  }, [matchId]);

  const fetchMatch = async () => {
    try {
      setIsLoading(true);
      const matchData = await getMatch(matchId);
      setMatch(matchData);
      setEvents(matchData.events);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch match data');
      console.error('Error fetching match:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(eventId);
              setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete event');
              console.error('Error deleting event:', error);
            }
          },
        },
      ]
    );
  };

  const handleEditEvent = (event: ParsedEvent) => {
    setEditingEventId(event.id);
    setEditMinute(event.minute.toString());
    setEditPlayerId(event.player_id?.toString() || '');
  };

  const handleSaveEdit = async (eventId: number) => {
    try {
      const updates = {
        minute: parseInt(editMinute),
        player_id: editPlayerId ? parseInt(editPlayerId) : undefined,
      };

      const updatedEvent = await updateEvent(eventId, updates);
      
      setEvents(prevEvents =>
        prevEvents.map(event =>
          event.id === eventId ? updatedEvent : event
        )
      );
      
      setEditingEventId(null);
      setEditMinute('');
      setEditPlayerId('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update event');
      console.error('Error updating event:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setEditMinute('');
    setEditPlayerId('');
  };

  const renderEvent = ({ item }: { item: ParsedEvent }) => {
    const isEditing = editingEventId === item.id;

    return (
      <View style={styles.eventItem}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventType}>{item.event_type}</Text>
          <Text style={styles.eventTime}>Minute {item.minute}</Text>
        </View>
        
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.editInput}
              value={editMinute}
              onChangeText={setEditMinute}
              placeholder="Minute"
              keyboardType="numeric"
            />
            <TextInput
              style={styles.editInput}
              value={editPlayerId}
              onChangeText={setEditPlayerId}
              placeholder="Player ID"
              keyboardType="numeric"
            />
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={() => handleSaveEdit(item.id)}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancelEdit}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.eventDetails}>
              Player: {item.player_id || 'Unknown'}
            </Text>
            {item.raw_text && (
              <Text style={styles.rawText}>"{item.raw_text}"</Text>
            )}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.editButton]}
                onPress={() => handleEditEvent(item)}
              >
                <Text style={styles.buttonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.deleteButton]}
                onPress={() => handleDeleteEvent(item.id)}
              >
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading match data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Post-Match Review</Text>
      
      {match && (
        <View style={styles.matchInfo}>
          <Text style={styles.matchTitle}>
            vs {match.opponent_name}
          </Text>
          <Text style={styles.matchDetails}>
            {match.competition && `${match.competition} • `}
            {new Date(match.kickoff_at).toLocaleDateString()}
          </Text>
        </View>
      )}

      <Text style={styles.eventsTitle}>Events ({events.length})</Text>
      
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id.toString()}
        style={styles.eventsList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No events recorded for this match</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  matchInfo: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  matchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  matchDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  eventsList: {
    flex: 1,
  },
  eventItem: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  eventTime: {
    fontSize: 14,
    color: '#666',
  },
  eventDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  rawText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  editContainer: {
    marginTop: 10,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    backgroundColor: 'white',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    minWidth: 70,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  saveButton: {
    backgroundColor: '#34C759',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 50,
  },
});

export default PostMatchReviewScreen;
