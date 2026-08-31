import type { Player } from "@/lib/domain";
import { projectedValue, usableValueOverReplacement, valueOverReplacement } from "./playerValue";
import type { BasePosition, PreseasonPlayerContribution, ReplacementLevels } from "./types";

export const POSITION_DEPTH_MULTIPLIERS = [0.5, 0.25, 0.125, 0.0625] as const;
export const BENCH_MULTIPLIERS = [0.5, 0.35, 0.25, 0.15, 0.1] as const;

export function positionDepthMultiplier(index: number) {
  return 0.5 ** (index + 1);
}

export function benchMultiplier(index: number) {
  return BENCH_MULTIPLIERS[index] ?? 0.05;
}

export function playerContribution(
  player: Player,
  replacements: ReplacementLevels,
  role: PreseasonPlayerContribution["role"],
  multiplier: number,
  assignedSlot?: string,
): PreseasonPlayerContribution {
  const replacementLevel = replacements.byPosition[player.position as BasePosition] ?? 0;
  const rawVOR = valueOverReplacement(player, replacementLevel);
  const usableVOR = usableValueOverReplacement(player, replacementLevel);
  return {
    playerId: player.id,
    name: player.name,
    position: player.position,
    seasonProjectedPoints: projectedValue(player),
    replacementLevel,
    rawVOR,
    usableVOR,
    contributionMultiplier: multiplier,
    finalContribution: usableVOR * multiplier,
    assignedSlot,
    role,
  };
}

export function orderedPlayers(players: Player[], replacements: ReplacementLevels) {
  return [...players]
    .sort((a, b) => {
      const aValue = usableValueOverReplacement(a, replacements.byPosition[a.position as BasePosition] ?? 0);
      const bValue = usableValueOverReplacement(b, replacements.byPosition[b.position as BasePosition] ?? 0);
      return bValue - aValue || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    });
}

export function usefulPlayers(players: Player[], replacements: ReplacementLevels) {
  return orderedPlayers(players, replacements).filter((player) => usableValueOverReplacement(player, replacements.byPosition[player.position as BasePosition] ?? 0) > 0);
}
