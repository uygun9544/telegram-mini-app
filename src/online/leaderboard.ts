export interface LeaderboardRow {
  playerId: string;
  name: string;
  avatarUrl?: string | null;
  balance: number;
  wins: number;
  losses: number;
  matches: number;
  winRate: number;
}

function getLeaderboardUrl(): string {
  const customUrl = import.meta.env.VITE_LEADERBOARD_URL;
  if (customUrl) return customUrl;

  const wsUrl = import.meta.env.VITE_MATCH_WS_URL || "ws://localhost:8787";

  if (wsUrl.startsWith("wss://")) {
    return `${wsUrl.replace("wss://", "https://")}/leaders`;
  }

  if (wsUrl.startsWith("ws://")) {
    return `${wsUrl.replace("ws://", "http://")}/leaders`;
  }

  return "http://localhost:8787/leaders";
}

const LEADERBOARD_URL = getLeaderboardUrl();

export async function fetchTopLeaders(limit = 20): Promise<LeaderboardRow[]> {
  const response = await fetch(`${LEADERBOARD_URL}?limit=${limit}`, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to load leaders");
  }

  const payload = (await response.json()) as {
    ok?: boolean;
    rows?: LeaderboardRow[];
  };

  if (!payload.ok || !Array.isArray(payload.rows)) {
    throw new Error("Invalid leaders response");
  }

  return payload.rows;
}
