import type { EnemyTurnPlan, Position } from "../types";
import {
  getTrainingBotConfig,
  randomTrainingBotReactionMs,
} from "../trainingConfig";

export function createTrainingEnemyTurnPlan(
  positions: [Position, Position] | []
): EnemyTurnPlan {
  const trainingBotConfig = getTrainingBotConfig();
  const reactionMs = randomTrainingBotReactionMs(trainingBotConfig);

  if (Math.random() < trainingBotConfig.missChance) {
    return {
      state: "miss",
      time: null,
      decisionDelayMs: reactionMs,
      markers: [
        {
          top: Math.random() * 88 + 6,
          left: Math.random() * 88 + 6
        }
      ]
    };
  }

  const successMarkers =
    positions.length === 2
      ? [
          {
            top: positions[0].top + 6,
            left: positions[0].left + 6
          },
          {
            top: positions[1].top + 6,
            left: positions[1].left + 6,
            delayMs: 180
          }
        ]
      : [];

  return {
    state: "success",
    time: reactionMs,
    decisionDelayMs: reactionMs,
    markers: successMarkers
  };
}
