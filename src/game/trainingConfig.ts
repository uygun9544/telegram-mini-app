export type TrainingBotConfig = {
  reactionMinMs: number;
  reactionMaxMs: number;
  missChance: number;
};

const DEFAULT_TRAINING_BOT_CONFIG: TrainingBotConfig = {
  reactionMinMs: 500,
  reactionMaxMs: 2300,
  missChance: 0.25,
};

let currentTrainingBotConfig: TrainingBotConfig = DEFAULT_TRAINING_BOT_CONFIG;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeTrainingBotConfig(
  raw: Partial<TrainingBotConfig> | null | undefined
): TrainingBotConfig {
  const minCandidate = Number(raw?.reactionMinMs);
  const maxCandidate = Number(raw?.reactionMaxMs);
  const missChanceCandidate = Number(raw?.missChance);

  const reactionMinMs = Number.isFinite(minCandidate)
    ? Math.max(0, Math.floor(minCandidate))
    : DEFAULT_TRAINING_BOT_CONFIG.reactionMinMs;

  const reactionMaxMs = Number.isFinite(maxCandidate)
    ? Math.max(reactionMinMs, Math.floor(maxCandidate))
    : DEFAULT_TRAINING_BOT_CONFIG.reactionMaxMs;

  const missChance = Number.isFinite(missChanceCandidate)
    ? clamp(missChanceCandidate, 0, 1)
    : DEFAULT_TRAINING_BOT_CONFIG.missChance;

  return {
    reactionMinMs,
    reactionMaxMs,
    missChance,
  };
}

function getTrainingConfigUrl(): string {
  const customUrl = import.meta.env.VITE_TRAINING_CONFIG_URL;
  if (customUrl) return customUrl;

  const wsUrl = import.meta.env.VITE_MATCH_WS_URL || "ws://localhost:8787";

  if (wsUrl.startsWith("wss://")) {
    return `${wsUrl.replace("wss://", "https://")}/training-config`;
  }

  if (wsUrl.startsWith("ws://")) {
    return `${wsUrl.replace("ws://", "http://")}/training-config`;
  }

  return "http://localhost:8787/training-config";
}

const TRAINING_CONFIG_URL = getTrainingConfigUrl();

export function getTrainingBotConfig(): TrainingBotConfig {
  return currentTrainingBotConfig;
}

export function randomTrainingBotReactionMs(config: TrainingBotConfig): number {
  return Math.floor(
    Math.random() * (config.reactionMaxMs - config.reactionMinMs + 1)
  ) + config.reactionMinMs;
}

export async function refreshTrainingBotConfig(): Promise<void> {
  try {
    const response = await fetch(TRAINING_CONFIG_URL, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) return;

    const payload = (await response.json()) as {
      config?: Partial<TrainingBotConfig>;
    };

    if (!payload.config) return;

    currentTrainingBotConfig = normalizeTrainingBotConfig(payload.config);
  } catch {
    currentTrainingBotConfig = normalizeTrainingBotConfig(currentTrainingBotConfig);
  }
}

export function startTrainingBotConfigAutoRefresh(
  intervalMs = 30000
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  void refreshTrainingBotConfig();

  const timerId = window.setInterval(() => {
    void refreshTrainingBotConfig();
  }, intervalMs);

  return () => {
    window.clearInterval(timerId);
  };
}
