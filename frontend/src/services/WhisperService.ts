// TODO: Later replace with local whisper.cpp integration

const API_BASE_URL = 'http://localhost:8000'; // Adjust this to match your backend URL

// Helper function to add timeout to fetch requests
const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number = 30000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
};

export interface TranscriptionResponse {
  transcript: string;
  confidence?: number;
  duration?: number;
}

/**
 * Transcribe audio file using backend Whisper API
 * @param filePath - Path to the audio file to transcribe
 * @returns Promise<string> - The transcribed text
 */
export async function transcribeAudio(filePath: string): Promise<string> {
  try {
    console.log(`🎤 Starting transcription for: ${filePath}`);
    
    // Validate file path before creating FormData
    if (!filePath || filePath.trim() === '') {
      throw new Error('No recording file URI found');
    }
    
    console.log(`📁 Validating file path: ${filePath}`);
    
    // Create FormData for multipart/form-data upload
    const formData = new FormData();
    
    // Append file with proper structure for React Native
    formData.append("file", {
      uri: filePath,
      name: "recording.m4a",
      type: "audio/m4a"
    } as any);
    
    // Make POST request to backend transcription endpoint with timeout
    const response = await fetchWithTimeout(`${API_BASE_URL}/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    }, 60000); // 60 second timeout for audio processing
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Transcription failed with status ${response.status}:`, errorText);
      console.error(`❌ Response headers:`, Object.fromEntries(response.headers.entries()));
      console.error(`❌ Full response body:`, errorText);
      
      // Only throw error for backend/server errors (4xx, 5xx)
      if (response.status >= 400) {
        throw new Error(`Backend error: ${response.status} - ${errorText || response.statusText}`);
      }
      
      throw new Error(`Transcription failed: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response
    const result: TranscriptionResponse = await response.json();
    
    if (!result.transcript) {
      console.error('❌ No transcript in response:', result);
      throw new Error('Transcription failed: No transcript received');
    }
    
    console.log(`✅ Transcription successful: "${result.transcript}"`);
    return result.transcript;
    
  } catch (error) {
    console.error('❌ Transcription error:', error);
    
    // Re-throw with consistent error message
    if (error instanceof Error) {
      throw new Error(`Transcription failed: ${error.message}`);
    } else {
      throw new Error('Transcription failed: Unknown error occurred');
    }
  }
}

/**
 * Transcribe audio file with additional metadata
 * @param filePath - Path to the audio file to transcribe
 * @returns Promise<TranscriptionResponse> - The full transcription response
 */
export async function transcribeAudioWithMetadata(filePath: string): Promise<TranscriptionResponse> {
  try {
    console.log(`🎤 Starting transcription with metadata for: ${filePath}`);
    
    const formData = new FormData();
    
    // Append file with proper structure for React Native
    formData.append("file", {
      uri: filePath,
      name: "recording.m4a",
      type: "audio/m4a"
    } as any);
    
    const response = await fetch(`${API_BASE_URL}/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Transcription failed with status ${response.status}:`, errorText);
      throw new Error(`Transcription failed: ${response.status} ${response.statusText}`);
    }
    
    const result: TranscriptionResponse = await response.json();
    
    if (!result.transcript) {
      console.error('❌ No transcript in response:', result);
      throw new Error('Transcription failed: No transcript received');
    }
    
    console.log(`✅ Transcription successful: "${result.transcript}"`);
    console.log(`📊 Confidence: ${result.confidence}, Duration: ${result.duration}s`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Transcription error:', error);
    
    if (error instanceof Error) {
      throw new Error(`Transcription failed: ${error.message}`);
    } else {
      throw new Error('Transcription failed: Unknown error occurred');
    }
  }
}

/**
 * Check if the transcription service is available
 * @returns Promise<boolean> - True if service is available
 */
export async function isTranscriptionServiceAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/transcribe/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error('❌ Transcription service health check failed:', error);
    return false;
  }
}

/**
 * Get supported audio formats from the transcription service
 * @returns Promise<string[]> - Array of supported audio formats
 */
export async function getSupportedAudioFormats(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/transcribe/formats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get supported formats: ${response.status}`);
    }
    
    const result = await response.json();
    return result.formats || ['m4a', 'mp3', 'wav', 'flac'];
    
  } catch (error) {
    console.error('❌ Failed to get supported audio formats:', error);
    // Return default formats if service is unavailable
    return ['m4a', 'mp3', 'wav', 'flac'];
  }
}

export default {
  transcribeAudio,
  transcribeAudioWithMetadata,
  isTranscriptionServiceAvailable,
  getSupportedAudioFormats,
};
