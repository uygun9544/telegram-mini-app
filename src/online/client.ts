import type { PlayerState } from "../game/types";
import type { PlayerProfile, RoundPlan } from "./types";

type ClientEventMap = {
  connected: undefined;
  disconnected: undefined;
  matchFound: { roomId: string; opponent: PlayerProfile };
  matchReady: { roomId: string; opponent: PlayerProfile; roundPlan: RoundPlan };
  matchAcceptUpdate: { roomId: string; acceptedPlayerIds: string[] };
  matchCancelled: { roomId: string };
  opponentLeft: { roomId: string };
  error: { message: string };
};

type RoundSubmitPayload = {
  roomId: string;
  round: number;
  state: Exclude<PlayerState, null>;
  time: number | null;
};

type RoundResultPayload = {
  roomId: string;
  round: number;
  enemyState: Exclude<PlayerState, null>;
  enemyTime: number | null;
  nextRoundPlan: RoundPlan;
};

type PendingRoundResolver = {
  resolve: (payload: RoundResultPayload) => void;
  reject: (reason?: unknown) => void;
};

type ServerMessage =
  | { type: "connected" }
  | { type: "match_found"; roomId: string; opponent: PlayerProfile }
  | { type: "match_ready"; roomId: string; opponent: PlayerProfile; roundPlan: RoundPlan }
  | { type: "match_accept_update"; roomId: string; acceptedPlayerIds: string[] }
  | { type: "match_cancelled"; roomId: string }
  | { type: "opponent_left"; roomId: string }
  | RoundResultPayload & { type: "round_result" }
  | { type: "error"; message: string };

function getWsUrl(): string {
  return import.meta.env.VITE_MATCH_WS_URL || "ws://localhost:8787";
}

export const ONLINE_WS_URL = getWsUrl();

class OnlineClient {
  private socket: WebSocket | null = null;
  private connectionPromise: Promise<void> | null = null;
  private listeners: {
    [K in keyof ClientEventMap]: Set<(payload: ClientEventMap[K]) => void>
  } = {
    connected: new Set(),
    disconnected: new Set(),
    matchFound: new Set(),
    matchReady: new Set(),
    matchAcceptUpdate: new Set(),
    matchCancelled: new Set(),
    opponentLeft: new Set(),
    error: new Set()
  };
  private pendingRoundResolvers = new Map<string, PendingRoundResolver>();

  private emit<K extends keyof ClientEventMap>(
    event: K,
    payload: ClientEventMap[K]
  ) {
    this.listeners[event].forEach((listener) => listener(payload));
  }

  on<K extends keyof ClientEventMap>(
    event: K,
    handler: (payload: ClientEventMap[K]) => void
  ): () => void {
    this.listeners[event].add(handler);
    return () => {
      this.listeners[event].delete(handler);
    };
  }

  private handleMessage(message: ServerMessage) {
    switch (message.type) {
      case "connected":
        this.emit("connected", undefined);
        return;
      case "match_found":
        this.emit("matchFound", {
          roomId: message.roomId,
          opponent: message.opponent
        });
        return;
      case "match_ready":
        this.emit("matchReady", {
          roomId: message.roomId,
          opponent: message.opponent,
          roundPlan: message.roundPlan
        });
        return;
      case "match_accept_update":
        this.emit("matchAcceptUpdate", {
          roomId: message.roomId,
          acceptedPlayerIds: message.acceptedPlayerIds
        });
        return;
      case "match_cancelled":
        this.emit("matchCancelled", { roomId: message.roomId });
        return;
      case "opponent_left":
        this.emit("opponentLeft", { roomId: message.roomId });
        return;
      case "round_result": {
        const key = `${message.roomId}:${message.round}`;
        const pending = this.pendingRoundResolvers.get(key);
        if (pending) {
          pending.resolve(message);
          this.pendingRoundResolvers.delete(key);
        }
        return;
      }
      case "error":
        this.emit("error", { message: message.message });
        return;
      default:
        return;
    }
  }

  async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const ws = new WebSocket(ONLINE_WS_URL);
      this.socket = ws;

      ws.onopen = () => {
        resolve();
      };

      ws.onerror = () => {
        reject(new Error("WebSocket connection failed"));
      };

      ws.onclose = () => {
        this.emit("disconnected", undefined);
        this.connectionPromise = null;
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as ServerMessage;
          this.handleMessage(parsed);
        } catch {
          this.emit("error", { message: "Invalid server message" });
        }
      };
    });

    return this.connectionPromise;
  }

  private send(type: string, payload: Record<string, unknown> = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Socket is not connected");
    }

    this.socket.send(JSON.stringify({ type, ...payload }));
  }

  async joinQueue(profile: PlayerProfile) {
    await this.connect();
    this.send("join_queue", { profile });
  }

  cancelQueue() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.send("cancel_queue");
  }

  acceptMatch(roomId: string) {
    this.send("accept_match", { roomId });
  }

  cancelMatch(roomId: string) {
    this.send("cancel_match", { roomId });
  }

  submitRound(payload: RoundSubmitPayload): Promise<RoundResultPayload> {
    const key = `${payload.roomId}:${payload.round}`;

    return new Promise((resolve, reject) => {
      this.pendingRoundResolvers.set(key, { resolve, reject });

      try {
        this.send("round_submit", payload);
      } catch (error) {
        this.pendingRoundResolvers.delete(key);
        reject(error);
      }
    });
  }

  resetRoundResolver(roomId: string, round: number) {
    const key = `${roomId}:${round}`;
    const pending = this.pendingRoundResolvers.get(key);
    if (pending) {
      pending.reject(new Error("Round cancelled"));
      this.pendingRoundResolvers.delete(key);
    }
  }
}

export const onlineClient = new OnlineClient();
