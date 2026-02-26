import type { EnemyTurnPlan, Position } from "../types";

export function createTrainingEnemyTurnPlan(
  positions: [Position, Position] | []
): EnemyTurnPlan {
  if (Math.random() < 0.25) {
    return {
      state: "miss",
      time: null,
      decisionDelayMs: 1200,
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
    time: Math.floor(300 + Math.random() * 500),
    decisionDelayMs: 1200,
    markers: successMarkers
  };
}
