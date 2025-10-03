export interface ParsedEvent {
  id: number;
  match_id: number;
  minute: number;
  event_type: string;
  team_context: string;
  player_id?: number;
  raw_text?: string;
  meta_json?: any;
  created_at: string;
}

export interface RawEventPayload {
  raw_text: string;
}

export interface Match {
  id: number;
  team_id: number;
  opponent_name: string;
  kickoff_at: string;
  competition?: string;
  venue?: string;
  created_at: string;
  events: ParsedEvent[];
}

export interface UpdateEventPayload {
  minute?: number;
  player_id?: number;
}

export interface PlayerStats {
  player_id: number;
  player_name: string;
  goals: number;
  assists: number;
  tackles: number;
  passes_completed: number;
  passes_attempted: number;
  pass_accuracy: number;
  minutes_played: number;
  matches_played: number;
  yellow_cards: number;
  red_cards: number;
  shots_on_target: number;
  shots_total: number;
  shot_accuracy: number;
  duels_won: number;
  duels_total: number;
  duel_win_rate: number;
}

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.xx:8000';

// Helper function to log full error details when fetch fails
const logError = async (response: Response, operation: string, url?: string): Promise<void> => {
  console.error(`❌ ${operation} failed with status:`, response.status);
  if (url) {
    console.error(`❌ URL called:`, url);
  }
  console.error(`❌ Response headers:`, Object.fromEntries(response.headers.entries()));
  
  try {
    const errorText = await response.text();
    console.error(`❌ Response body:`, errorText);
  } catch (e) {
    console.error(`❌ Could not read response body:`, e);
  }
};

// Helper function to handle fetch errors with clear messages
const handleFetchError = (error: any, operation: string): never => {
  console.error(`❌ ${operation} failed:`, error);
  
  if (error instanceof TypeError && error.message.includes('fetch')) {
    throw new Error(`Network error: Unable to connect to server. Please check your connection.`);
  }
  
  if (error.message) {
    throw new Error(`${operation} failed: ${error.message}`);
  }
  
  throw new Error(`${operation} failed: Unknown error occurred`);
};

export async function sendRawEvent(matchId: number, rawText: string): Promise<ParsedEvent> {
  const url = `${API_BASE_URL}/matches/${matchId}/events/raw`;
  
  const payload: RawEventPayload = {
    raw_text: rawText
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await logError(response, 'Sending raw event', url);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const parsedEvent: ParsedEvent = await response.json();
    return parsedEvent;
  } catch (error) {
    handleFetchError(error, 'Sending raw event');
  }
}

export async function getMatch(matchId: number): Promise<Match> {
  const url = `${API_BASE_URL}/matches/${matchId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      await logError(response, 'Fetching match', url);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const match: Match = await response.json();
    return match;
  } catch (error) {
    handleFetchError(error, 'Fetching match');
  }
}

export async function deleteEvent(eventId: number): Promise<void> {
  const url = `${API_BASE_URL}/events/${eventId}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      await logError(response, 'Deleting event', url);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    handleFetchError(error, 'Deleting event');
  }
}

export async function updateEvent(eventId: number, updates: UpdateEventPayload): Promise<ParsedEvent> {
  const url = `${API_BASE_URL}/events/${eventId}`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      await logError(response, 'Updating event', url);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const updatedEvent: ParsedEvent = await response.json();
    return updatedEvent;
  } catch (error) {
    handleFetchError(error, 'Updating event');
  }
}

export async function getPlayerStats(playerId: number): Promise<PlayerStats> {
  const url = `${API_BASE_URL}/players/${playerId}/stats`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      await logError(response, 'Fetching player stats', url);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const playerStats: PlayerStats = await response.json();
    return playerStats;
  } catch (error) {
    handleFetchError(error, 'Fetching player stats');
  }
}
