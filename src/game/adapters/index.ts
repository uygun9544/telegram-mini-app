import type { EnemyTurnPlan, GameMode, Position } from "../types";
import { createOnlineEnemyTurnPlan } from "./online";
import { createTrainingEnemyTurnPlan } from "./training";

export function createEnemyTurnPlan(
  mode: GameMode,
  positions: [Position, Position] | []
): EnemyTurnPlan {
  if (mode === "online") {
    return createOnlineEnemyTurnPlan(positions);
  }

  return createTrainingEnemyTurnPlan(positions);
}
