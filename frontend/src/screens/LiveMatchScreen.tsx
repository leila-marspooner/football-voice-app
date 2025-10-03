import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { sendRawEvent, deleteEvent, ParsedEvent, API_BASE_URL } from '../services/ApiClient';
import { audioRecorderService } from '../services/AudioRecorderService';
import { transcribeAudio } from '../services/WhisperService';
import { dbCacheService } from '../services/DbCacheService';
import { syncService } from '../services/SyncService';

type LiveMatchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LiveMatch'>;

interface LiveMatchScreenProps {
  navigation: LiveMatchScreenNavigationProp;
  route?: {
    params?: {
      matchId?: number;
    };
  };
}

const LiveMatchScreen: React.FC<LiveMatchScreenProps> = ({ navigation, route }) => {
  const matchId = route?.params?.matchId || 1;
  const [isRecording, setIsRecording] = useState(false);
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTranscripts, setPendingTranscripts] = useState<{[key: string]: string}>({});
  const [syncStats, setSyncStats] = useState({ pendingEvents: 0, pendingAudio: 0, isSyncing: false });

  useEffect(() => {
    initializeServices();
    loadCachedEvents();
    updateSyncStats();
  }, []);

  const initializeServices = async () => {
    try {
      await dbCacheService.init();
      console.log('✅ Services initialized');
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      Alert.alert('Error', 'Failed to initialize services');
    }
  };

  const loadCachedEvents = async () => {
    try {
      const cachedEvents = await dbCacheService.getEventsForMatch(matchId);
      const parsedEvents = cachedEvents.map(event => JSON.parse(event.parsed_json));
      setEvents(parsedEvents);
    } catch (error) {
      console.error('❌ Failed to load cached events:', error);
    }
  };

  const updateSyncStats = async () => {
    try {
      const stats = await syncService.getSyncStats();
      setSyncStats(stats);
    } catch (error) {
      console.error('❌ Failed to update sync stats:', error);
    }
  };

  const handleStartStopRecording = async () => {
    if (isRecording) {
      // Stop recording and process audio
      setIsLoading(true);
      
      try {
        // Stop audio recording and get file path
        const audioFilePath = await audioRecorderService.stopRecording();
        console.log('🎵 Audio recorded:', audioFilePath);
        
        // Show temporary transcript placeholder
        const tempId = `temp_${Date.now()}`;
        setPendingTranscripts(prev => ({
          ...prev,
          [tempId]: 'Transcribing...'
        }));
        
        // Transcribe audio using WhisperService
        const transcript = await transcribeAudio(audioFilePath);
        console.log('📝 Transcript:', transcript);
        
        // Update pending transcript
        setPendingTranscripts(prev => ({
          ...prev,
          [tempId]: transcript
        }));
        
        // Add transcript as a temporary event in the feed
        const transcriptEvent: ParsedEvent = {
          id: tempId,
          event_type: 'transcript',
          player: null,
          minute: null,
          raw_text: transcript,
          temp_id: tempId
        };
        setEvents(prevEvents => [...prevEvents, transcriptEvent]);
        
        // Save to cache with synced=false
        const eventId = await dbCacheService.saveEvent(matchId, transcript, {
          event_type: 'transcribed_audio',
          raw_text: transcript,
          temp_id: tempId
        }, false);
        
        const audioId = await dbCacheService.saveAudio(matchId, audioFilePath, false);
        
        // Attempt immediate sync - send transcript to backend for parsing
        try {
          const parsedEvent = await sendRawEvent(matchId, transcript);
          
          // Update cache with parsed event and mark as synced
          await dbCacheService.saveEvent(matchId, transcript, parsedEvent, true);
          await dbCacheService.markEventSynced(eventId);
          await dbCacheService.markAudioSynced(audioId);
          
          // Replace transcript event with parsed event
          setEvents(prevEvents => 
            prevEvents.map(event => 
              event.temp_id === tempId ? parsedEvent : event
            )
          );
          
          // Remove from pending transcripts
          setPendingTranscripts(prev => {
            const newPending = { ...prev };
            delete newPending[tempId];
            return newPending;
          });
          
          console.log('✅ Event synced successfully');
          
        } catch (syncError) {
          console.log('⚠️ Sync failed, keeping in cache:', syncError);
          // Keep in cache for later sync
        }
        
        // Update sync stats
        await updateSyncStats();
        
      } catch (error) {
        console.error('❌ Full error details:', error);
        console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
        console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
        
        const errorMessage = error instanceof Error ? error.message : 'Failed to process audio recording';
        Alert.alert('Error', errorMessage);
      } finally {
        setIsLoading(false);
        setIsRecording(false);
      }
    } else {
      // Start recording
      try {
        await audioRecorderService.startRecording();
        setIsRecording(true);
        console.log('🎤 Recording started');
      } catch (error) {
        console.error('Error starting recording:', error);
        
        // Check if it's a microphone permission error
        if (error instanceof Error && error.message === 'Microphone permission not granted') {
          Alert.alert(
            'Microphone Permission Required',
            'This app needs access to your microphone to record match commentary.\n\nPlease enable microphone access in:\nSettings > Privacy & Security > Microphone > Football Voice App',
            [
              { text: 'OK', style: 'default' }
            ]
          );
        } else {
          Alert.alert('Error', 'Failed to start recording');
        }
      }
    }
  };

  const handleUndo = async () => {
    if (events.length > 0) {
      const lastEvent = events[events.length - 1];
      
      try {
        // If event has an ID, it means it was persisted to backend
        if (lastEvent.id) {
          // Call API to delete the event from backend
          await deleteEvent(lastEvent.id);
          console.log(`✅ Deleted event ${lastEvent.id} from backend`);
        }
        
        // Remove from local state regardless
        setEvents(prevEvents => prevEvents.slice(0, -1));
        console.log('✅ Removed last event from local state');
        
      } catch (error) {
        // If backend deletion fails, still remove from local state
        console.error('❌ Failed to delete event from backend:', error);
        setEvents(prevEvents => prevEvents.slice(0, -1));
        
        Alert.alert(
          'Warning', 
          'Event removed locally but may still exist on server. Please check your data.'
        );
      }
    }
  };

  const handleRetrySync = async () => {
    if (syncService.isSyncInProgress()) {
      Alert.alert('Info', 'Sync is already in progress');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await syncService.retrySync();
      
      if (result.success) {
        Alert.alert(
          'Sync Complete', 
          `Successfully synced ${result.syncedEvents} events and ${result.syncedAudio} audio files`
        );
        
        // Reload events and update stats
        await loadCachedEvents();
        await updateSyncStats();
      } else {
        Alert.alert(
          'Sync Failed', 
          `Failed to sync some items. Errors: ${result.errors.join(', ')}`
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to retry sync');
      console.error('Error retrying sync:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToPostMatchReview = () => {
    navigation.navigate('PostMatchReview', { matchId });
  };

  const handleNavigateToStatsDashboard = () => {
    navigation.navigate('StatsDashboard', { playerIds: [1, 2, 3] }); // Default player IDs
  };

  const renderEvent = ({ item }: { item: ParsedEvent }) => (
    <View style={styles.eventItem}>
      <Text style={styles.eventType}>{item.event_type}</Text>
      <Text style={styles.eventDetails}>
        Player: {item.player_id || 'Unknown'} | Minute: {item.minute}
      </Text>
      {item.raw_text && (
        <Text style={styles.rawText}>"{item.raw_text}"</Text>
      )}
    </View>
  );

  const renderPendingTranscript = (tempId: string, transcript: string) => (
    <View style={[styles.eventItem, styles.pendingEvent]}>
      <Text style={styles.eventType}>Transcribing...</Text>
      <Text style={styles.eventDetails}>
        Status: {transcript === 'Transcribing...' ? 'Processing' : 'Waiting for sync'}
      </Text>
      <Text style={styles.rawText}>"{transcript}"</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Match Recording</Text>
      
      {/* Recording Indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording…</Text>
        </View>
      )}
      
      <View style={styles.buttonContainer}>
        {isLoading ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={styles.processingText}>Processing audio...</Text>
          </View>
        ) : (
          <Button
            title={isRecording ? "Stop Recording" : "Start Recording"}
            onPress={handleStartStopRecording}
            disabled={isLoading}
          />
        )}
        
        <Button
          title="Undo Last Event"
          onPress={handleUndo}
          disabled={events.length === 0}
        />
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <Button
          title="Go to Post-Match Review"
          onPress={handleNavigateToPostMatchReview}
        />
        
        <Button
          title="Go to Stats Dashboard"
          onPress={handleNavigateToStatsDashboard}
        />
      </View>

      {/* Sync Status and Retry Button */}
      {(syncStats.pendingEvents > 0 || syncStats.pendingAudio > 0) && (
        <View style={styles.syncStatusContainer}>
          <Text style={styles.syncStatusText}>
            {syncStats.pendingEvents} events, {syncStats.pendingAudio} audio files pending sync
          </Text>
          <Button
            title="Retry Sync"
            onPress={handleRetrySync}
            disabled={isLoading || syncStats.isSyncing}
          />
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text>Processing event...</Text>
        </View>
      )}

      <Text style={styles.eventsTitle}>
        Events ({events.length + Object.keys(pendingTranscripts).length})
      </Text>
      
      <FlatList
        data={[
          ...Object.entries(pendingTranscripts).map(([tempId, transcript]) => ({
            id: tempId,
            type: 'pending',
            tempId,
            transcript
          })),
          ...events.map(event => ({ ...event, type: 'synced' }))
        ]}
        renderItem={({ item }) => {
          if (item.type === 'pending') {
            return renderPendingTranscript(item.tempId, item.transcript);
          } else {
            return renderEvent({ item });
          }
        }}
        keyExtractor={(item) => item.id.toString()}
        style={styles.eventsList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No events recorded yet</Text>
        }
      />
      
      {/* API Base URL Display */}
      <Text style={styles.apiUrlText}>API: {API_BASE_URL}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 20,
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
  eventType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  eventDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  rawText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 50,
  },
  pendingEvent: {
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  syncStatusContainer: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  syncStatusText: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 8,
    textAlign: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F44336',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 10,
  },
  processingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  apiUrlText: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 8,
  },
});

export default LiveMatchScreen;
