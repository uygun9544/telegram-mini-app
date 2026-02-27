function getHealthUrl(): string {
  const wsUrl = import.meta.env.VITE_MATCH_WS_URL || "ws://localhost:8787";

  if (wsUrl.startsWith("wss://")) {
    return `${wsUrl.replace("wss://", "https://")}/health`;
  }

  if (wsUrl.startsWith("ws://")) {
    return `${wsUrl.replace("ws://", "http://")}/health`;
  }

  return "http://localhost:8787/health";
}

const HEALTH_URL = getHealthUrl();

export async function fetchSearchingPlayersCount(): Promise<number> {
  const response = await fetch(HEALTH_URL, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to load searching players count");
  }

  const payload = (await response.json()) as {
    queueSize?: number;
  };

  return Math.max(0, Number(payload.queueSize) || 0);
}
