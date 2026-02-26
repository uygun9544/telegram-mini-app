export interface PlayerProfile {
  playerId: string;
  name: string;
  avatarUrl: string | null;
  slipper: string;
}

export interface RoundPlan {
  round: number;
  colors: ["blue" | "red" | "yellow" | "green", "blue" | "red" | "yellow" | "green"];
  positions: [{ top: number; left: number }, { top: number; left: number }];
  revealAt: number;
  actionWindowMs: number;
}
