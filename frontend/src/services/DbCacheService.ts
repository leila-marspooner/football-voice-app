import * as SQLite from 'expo-sqlite';

export interface CachedEvent {
  id: number;
  match_id: number;
  raw_text: string;
  parsed_json: string; // JSON string
  synced: boolean;
  created_at: string;
}

export interface CachedAudio {
  id: number;
  match_id: number;
  file_path: string;
  synced: boolean;
  created_at: string;
}

class DbCacheService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  /**
   * Initialize the database and create tables if they don't exist
   */
  async init(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('football_cache.db');
      
      // Create events table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          match_id INTEGER NOT NULL,
          raw_text TEXT NOT NULL,
          parsed_json TEXT NOT NULL,
          synced BOOLEAN NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create audio table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS audio (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          match_id INTEGER NOT NULL,
          file_path TEXT NOT NULL,
          synced BOOLEAN NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes for better performance
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_events_match_id ON events(match_id);
        CREATE INDEX IF NOT EXISTS idx_events_synced ON events(synced);
        CREATE INDEX IF NOT EXISTS idx_audio_match_id ON audio(match_id);
        CREATE INDEX IF NOT EXISTS idx_audio_synced ON audio(synced);
      `);

      this.isInitialized = true;
      console.log('✅ Database cache initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database cache:', error);
      throw new Error('Failed to initialize database cache');
    }
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized || !this.db) {
      await this.init();
    }
  }

  /**
   * Save an event to the local cache
   */
  async saveEvent(
    matchId: number, 
    rawText: string, 
    parsedJson: any, 
    synced: boolean = false
  ): Promise<number> {
    await this.ensureInitialized();
    
    try {
      const parsedJsonString = JSON.stringify(parsedJson);
      
      const result = await this.db!.runAsync(
        'INSERT INTO events (match_id, raw_text, parsed_json, synced) VALUES (?, ?, ?, ?)',
        [matchId, rawText, parsedJsonString, synced ? 1 : 0]
      );
      
      console.log(`💾 Event saved to cache with ID: ${result.lastInsertRowId}`);
      return result.lastInsertRowId as number;
    } catch (error) {
      console.error('❌ Failed to save event to cache:', error);
      throw new Error('Failed to save event to cache');
    }
  }

  /**
   * Get all unsynced events
   */
  async getUnsyncedEvents(): Promise<CachedEvent[]> {
    await this.ensureInitialized();
    
    try {
      const result = await this.db!.getAllAsync(
        'SELECT * FROM events WHERE synced = 0 ORDER BY created_at ASC'
      );
      
      const events: CachedEvent[] = result.map((row: any) => ({
        id: row.id,
        match_id: row.match_id,
        raw_text: row.raw_text,
        parsed_json: row.parsed_json,
        synced: Boolean(row.synced),
        created_at: row.created_at,
      }));
      
      console.log(`📤 Found ${events.length} unsynced events`);
      return events;
    } catch (error) {
      console.error('❌ Failed to get unsynced events:', error);
      throw new Error('Failed to get unsynced events');
    }
  }

  /**
   * Mark an event as synced
   */
  async markEventSynced(eventId: number): Promise<void> {
    await this.ensureInitialized();
    
    try {
      const result = await this.db!.runAsync(
        'UPDATE events SET synced = 1 WHERE id = ?',
        [eventId]
      );
      
      if (result.changes === 0) {
        throw new Error(`Event with ID ${eventId} not found`);
      }
      
      console.log(`✅ Event ${eventId} marked as synced`);
    } catch (error) {
      console.error('❌ Failed to mark event as synced:', error);
      throw new Error('Failed to mark event as synced');
    }
  }

  /**
   * Save audio file reference to the local cache
   */
  async saveAudio(
    matchId: number, 
    filePath: string, 
    synced: boolean = false
  ): Promise<number> {
    await this.ensureInitialized();
    
    try {
      const result = await this.db!.runAsync(
        'INSERT INTO audio (match_id, file_path, synced) VALUES (?, ?, ?)',
        [matchId, filePath, synced ? 1 : 0]
      );
      
      console.log(`🎵 Audio saved to cache with ID: ${result.lastInsertRowId}`);
      return result.lastInsertRowId as number;
    } catch (error) {
      console.error('❌ Failed to save audio to cache:', error);
      throw new Error('Failed to save audio to cache');
    }
  }

  /**
   * Get all unsynced audio files
   */
  async getUnsyncedAudio(): Promise<CachedAudio[]> {
    await this.ensureInitialized();
    
    try {
      const result = await this.db!.getAllAsync(
        'SELECT * FROM audio WHERE synced = 0 ORDER BY created_at ASC'
      );
      
      const audioFiles: CachedAudio[] = result.map((row: any) => ({
        id: row.id,
        match_id: row.match_id,
        file_path: row.file_path,
        synced: Boolean(row.synced),
        created_at: row.created_at,
      }));
      
      console.log(`📤 Found ${audioFiles.length} unsynced audio files`);
      return audioFiles;
    } catch (error) {
      console.error('❌ Failed to get unsynced audio:', error);
      throw new Error('Failed to get unsynced audio');
    }
  }

  /**
   * Mark an audio file as synced
   */
  async markAudioSynced(audioId: number): Promise<void> {
    await this.ensureInitialized();
    
    try {
      const result = await this.db!.runAsync(
        'UPDATE audio SET synced = 1 WHERE id = ?',
        [audioId]
      );
      
      if (result.changes === 0) {
        throw new Error(`Audio with ID ${audioId} not found`);
      }
      
      console.log(`✅ Audio ${audioId} marked as synced`);
    } catch (error) {
      console.error('❌ Failed to mark audio as synced:', error);
      throw new Error('Failed to mark audio as synced');
    }
  }

  /**
   * Get all events for a specific match
   */
  async getEventsForMatch(matchId: number): Promise<CachedEvent[]> {
    await this.ensureInitialized();
    
    try {
      const result = await this.db!.getAllAsync(
        'SELECT * FROM events WHERE match_id = ? ORDER BY created_at ASC',
        [matchId]
      );
      
      const events: CachedEvent[] = result.map((row: any) => ({
        id: row.id,
        match_id: row.match_id,
        raw_text: row.raw_text,
        parsed_json: row.parsed_json,
        synced: Boolean(row.synced),
        created_at: row.created_at,
      }));
      
      return events;
    } catch (error) {
      console.error('❌ Failed to get events for match:', error);
      throw new Error('Failed to get events for match');
    }
  }

  /**
   * Get all audio files for a specific match
   */
  async getAudioForMatch(matchId: number): Promise<CachedAudio[]> {
    await this.ensureInitialized();
    
    try {
      const result = await this.db!.getAllAsync(
        'SELECT * FROM audio WHERE match_id = ? ORDER BY created_at ASC',
        [matchId]
      );
      
      const audioFiles: CachedAudio[] = result.map((row: any) => ({
        id: row.id,
        match_id: row.match_id,
        file_path: row.file_path,
        synced: Boolean(row.synced),
        created_at: row.created_at,
      }));
      
      return audioFiles;
    } catch (error) {
      console.error('❌ Failed to get audio for match:', error);
      throw new Error('Failed to get audio for match');
    }
  }

  /**
   * Clear all cached data (useful for testing or reset)
   */
  async clearAllCache(): Promise<void> {
    await this.ensureInitialized();
    
    try {
      await this.db!.execAsync('DELETE FROM events');
      await this.db!.execAsync('DELETE FROM audio');
      console.log('🗑️ All cache data cleared');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
      throw new Error('Failed to clear cache');
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEvents: number;
    unsyncedEvents: number;
    totalAudio: number;
    unsyncedAudio: number;
  }> {
    await this.ensureInitialized();
    
    try {
      const [totalEventsResult] = await this.db!.getAllAsync('SELECT COUNT(*) as count FROM events');
      const [unsyncedEventsResult] = await this.db!.getAllAsync('SELECT COUNT(*) as count FROM events WHERE synced = 0');
      const [totalAudioResult] = await this.db!.getAllAsync('SELECT COUNT(*) as count FROM audio');
      const [unsyncedAudioResult] = await this.db!.getAllAsync('SELECT COUNT(*) as count FROM audio WHERE synced = 0');
      
      return {
        totalEvents: (totalEventsResult as any).count,
        unsyncedEvents: (unsyncedEventsResult as any).count,
        totalAudio: (totalAudioResult as any).count,
        unsyncedAudio: (unsyncedAudioResult as any).count,
      };
    } catch (error) {
      console.error('❌ Failed to get cache stats:', error);
      throw new Error('Failed to get cache stats');
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
      console.log('🔒 Database connection closed');
    }
  }
}

// Export a singleton instance
export const dbCacheService = new DbCacheService();

// Also export the class for testing or multiple instances
export default DbCacheService;
