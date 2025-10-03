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

const API_BASE_URL = 'http://localhost:8000'; // Adjust this to match your backend URL

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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const parsedEvent: ParsedEvent = await response.json();
    return parsedEvent;
  } catch (error) {
    console.error('Error sending raw event:', error);
    throw error;
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const match: Match = await response.json();
    return match;
  } catch (error) {
    console.error('Error fetching match:', error);
    throw error;
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const updatedEvent: ParsedEvent = await response.json();
    return updatedEvent;
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const playerStats: PlayerStats = await response.json();
    return playerStats;
  } catch (error) {
    console.error('Error fetching player stats:', error);
    throw error;
  }
}
