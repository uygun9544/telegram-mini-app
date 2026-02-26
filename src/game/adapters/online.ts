import type { EnemyTurnPlan, Position } from "../types";
import { createTrainingEnemyTurnPlan } from "./training";

export function createOnlineEnemyTurnPlan(
  positions: [Position, Position] | []
): EnemyTurnPlan {
  return createTrainingEnemyTurnPlan(positions);
}
