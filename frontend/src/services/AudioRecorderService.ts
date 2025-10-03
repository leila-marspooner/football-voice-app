import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export interface AudioRecorderState {
  isRecording: boolean;
  recordingDuration: number;
  audioUri?: string;
}

export interface AudioRecorderCallbacks {
  onRecordingStarted?: () => void;
  onRecordingStopped?: (audioUri: string) => void;
  onError?: (error: string) => void;
}

class AudioRecorderService {
  private state: AudioRecorderState = {
    isRecording: false,
    recordingDuration: 0,
  };

  private callbacks: AudioRecorderCallbacks = {};
  private recordingInterval?: NodeJS.Timeout;
  private recording?: Audio.Recording;

  /**
   * Set callbacks for recording events
   */
  setCallbacks(callbacks: AudioRecorderCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Get current recording state
   */
  getState(): AudioRecorderState {
    return { ...this.state };
  }

  /**
   * Start audio recording using expo-av
   */
  async startRecording(): Promise<void> {
    if (this.state.isRecording) {
      throw new Error('Recording is already in progress');
    }

    try {
      console.log('🎤 Starting audio recording...');
      
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission not granted');
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      // Start recording
      await recording.startAsync();
      
      this.recording = recording;
      this.state.isRecording = true;
      this.state.recordingDuration = 0;
      this.state.audioUri = undefined;

      // Start duration counter
      this.recordingInterval = setInterval(() => {
        this.state.recordingDuration += 1;
      }, 1000);

      this.callbacks.onRecordingStarted?.();
      console.log('✅ Audio recording started');
    } catch (error) {
      this.state.isRecording = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.callbacks.onError?.(errorMessage);
      throw error;
    }
  }

  /**
   * Stop audio recording and save to cache directory
   */
  async stopRecording(): Promise<string> {
    if (!this.state.isRecording || !this.recording) {
      throw new Error('No recording in progress');
    }

    try {
      console.log('🛑 Stopping audio recording...');
      
      // Stop recording
      await this.recording.stopAndUnloadAsync();
      
      // Get the URI from the recording
      const originalUri = this.recording.getURI();
      if (!originalUri) {
        throw new Error('Failed to get recording URI');
      }

      // Create cache directory if it doesn't exist
      const cacheDir = `${FileSystem.cacheDirectory}audio/`;
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `recording_${timestamp}.m4a`;
      const cacheUri = `${cacheDir}${filename}`;

      // Move file to cache directory
      await FileSystem.moveAsync({
        from: originalUri,
        to: cacheUri,
      });

      this.state.isRecording = false;
      this.state.audioUri = cacheUri;
      
      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = undefined;
      }

      this.callbacks.onRecordingStopped?.(cacheUri);
      
      console.log(`✅ Audio recording stopped - Duration: ${this.state.recordingDuration}s`);
      console.log(`📁 Audio file saved: ${cacheUri}`);
      
      return cacheUri;
    } catch (error) {
      this.state.isRecording = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.callbacks.onError?.(errorMessage);
      throw error;
    } finally {
      // Clean up recording object
      if (this.recording) {
        this.recording = undefined;
      }
    }
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.state.isRecording;
  }

  /**
   * Get recording duration in seconds
   */
  getRecordingDuration(): number {
    return this.state.recordingDuration;
  }

  /**
   * Get the URI of the last recorded audio file
   */
  getLastRecordingUri(): string | undefined {
    return this.state.audioUri;
  }

  /**
   * Reset the recorder state
   */
  reset(): void {
    this.state.isRecording = false;
    this.state.recordingDuration = 0;
    this.state.audioUri = undefined;
    
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = undefined;
    }

    if (this.recording) {
      this.recording = undefined;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.reset();
    this.callbacks = {};
  }
}

// Export a singleton instance
export const audioRecorderService = new AudioRecorderService();

// Also export the class for testing or multiple instances
export default AudioRecorderService;
