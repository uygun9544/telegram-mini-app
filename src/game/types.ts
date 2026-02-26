export type GameMode = "training" | "online";

export type ColorItem = {
  name: string;
  emoji: string;
};

export type PlayerState = "success" | "miss" | "none" | null;

export type Position = {
  top: number;
  left: number;
};

export type ClickMarker = {
  id: number;
  owner: "player" | "enemy";
  top: number;
  left: number;
};

export type EnemyMarker = {
  top: number;
  left: number;
  delayMs?: number;
};

export type EnemyTurnPlan = {
  state: Exclude<PlayerState, null>;
  time: number | null;
  markers: EnemyMarker[];
  decisionDelayMs: number;
};

export type RoundRefType = {
  playerStep: number;
  playerState: PlayerState;
  playerTime: number | null;
  playerFinished: boolean;
  enemyState: PlayerState;
  enemyTime: number | null;
  enemyFinished: boolean;
};
