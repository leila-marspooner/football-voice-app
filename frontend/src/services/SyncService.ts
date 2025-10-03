import { dbCacheService } from './DbCacheService';
import { sendRawEvent } from './ApiClient';
import { transcribeAudio } from './WhisperService';

export interface SyncResult {
  success: boolean;
  syncedEvents: number;
  syncedAudio: number;
  errors: string[];
}

export interface PendingEvent {
  id: number;
  match_id: number;
  raw_text: string;
  parsed_json: any;
  audio_file_path?: string;
}

class SyncService {
  private isSyncing = false;

  /**
   * Retry syncing all unsynced events and audio files
   */
  async retrySync(): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      syncedEvents: 0,
      syncedAudio: 0,
      errors: [],
    };

    try {
      console.log('🔄 Starting sync retry...');

      // Get all unsynced events
      const unsyncedEvents = await dbCacheService.getUnsyncedEvents();
      const unsyncedAudio = await dbCacheService.getUnsyncedAudio();

      console.log(`📤 Found ${unsyncedEvents.length} unsynced events and ${unsyncedAudio.length} unsynced audio files`);

      // Sync events
      for (const event of unsyncedEvents) {
        try {
          const parsedJson = JSON.parse(event.parsed_json);
          
          // Send to backend
          await sendRawEvent(event.match_id, event.raw_text);
          
          // Mark as synced
          await dbCacheService.markEventSynced(event.id);
          result.syncedEvents++;
          
          console.log(`✅ Synced event ${event.id}`);
        } catch (error) {
          const errorMessage = `Failed to sync event ${event.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMessage);
          result.success = false;
          console.error(`❌ ${errorMessage}`);
        }
      }

      // Sync audio files (transcribe and send)
      for (const audio of unsyncedAudio) {
        try {
          // Transcribe audio
          const transcript = await transcribeAudio(audio.file_path);
          
          // Send to backend
          await sendRawEvent(audio.match_id, transcript);
          
          // Mark as synced
          await dbCacheService.markAudioSynced(audio.id);
          result.syncedAudio++;
          
          console.log(`✅ Synced audio ${audio.id}`);
        } catch (error) {
          const errorMessage = `Failed to sync audio ${audio.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMessage);
          result.success = false;
          console.error(`❌ ${errorMessage}`);
        }
      }

      console.log(`🎉 Sync completed: ${result.syncedEvents} events, ${result.syncedAudio} audio files synced`);
      
    } catch (error) {
      const errorMessage = `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMessage);
      result.success = false;
      console.error(`❌ ${errorMessage}`);
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Get all pending (unsynced) events
   */
  async getPendingEvents(): Promise<PendingEvent[]> {
    try {
      const unsyncedEvents = await dbCacheService.getUnsyncedEvents();
      const unsyncedAudio = await dbCacheService.getUnsyncedAudio();

      const pendingEvents: PendingEvent[] = [];

      // Add unsynced events
      for (const event of unsyncedEvents) {
        pendingEvents.push({
          id: event.id,
          match_id: event.match_id,
          raw_text: event.raw_text,
          parsed_json: JSON.parse(event.parsed_json),
        });
      }

      // Add unsynced audio (transcribe them)
      for (const audio of unsyncedAudio) {
        try {
          const transcript = await transcribeAudio(audio.file_path);
          pendingEvents.push({
            id: audio.id,
            match_id: audio.match_id,
            raw_text: transcript,
            parsed_json: { event_type: 'transcribed_audio', source: 'audio' },
            audio_file_path: audio.file_path,
          });
        } catch (error) {
          console.error(`Failed to transcribe audio ${audio.id}:`, error);
        }
      }

      return pendingEvents;
    } catch (error) {
      console.error('Failed to get pending events:', error);
      return [];
    }
  }

  /**
   * Check if sync is currently in progress
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    pendingEvents: number;
    pendingAudio: number;
    isSyncing: boolean;
  }> {
    try {
      const cacheStats = await dbCacheService.getCacheStats();
      return {
        pendingEvents: cacheStats.unsyncedEvents,
        pendingAudio: cacheStats.unsyncedAudio,
        isSyncing: this.isSyncing,
      };
    } catch (error) {
      console.error('Failed to get sync stats:', error);
      return {
        pendingEvents: 0,
        pendingAudio: 0,
        isSyncing: this.isSyncing,
      };
    }
  }

  /**
   * Force sync a specific event
   */
  async syncEvent(eventId: number): Promise<boolean> {
    try {
      const events = await dbCacheService.getUnsyncedEvents();
      const event = events.find(e => e.id === eventId);
      
      if (!event) {
        throw new Error(`Event ${eventId} not found or already synced`);
      }

      const parsedJson = JSON.parse(event.parsed_json);
      await sendRawEvent(event.match_id, event.raw_text);
      await dbCacheService.markEventSynced(eventId);
      
      console.log(`✅ Force synced event ${eventId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to force sync event ${eventId}:`, error);
      return false;
    }
  }

  /**
   * Force sync a specific audio file
   */
  async syncAudio(audioId: number): Promise<boolean> {
    try {
      const audioFiles = await dbCacheService.getUnsyncedAudio();
      const audio = audioFiles.find(a => a.id === audioId);
      
      if (!audio) {
        throw new Error(`Audio ${audioId} not found or already synced`);
      }

      const transcript = await transcribeAudio(audio.file_path);
      await sendRawEvent(audio.match_id, transcript);
      await dbCacheService.markAudioSynced(audioId);
      
      console.log(`✅ Force synced audio ${audioId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to force sync audio ${audioId}:`, error);
      return false;
    }
  }
}

// Export a singleton instance
export const syncService = new SyncService();

// Also export the class for testing or multiple instances
export default SyncService;
