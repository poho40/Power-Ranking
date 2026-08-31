import type { League, Player } from "@/lib/domain";
import { FLEX_SLOTS, starterSlots } from "./config";
import { projectedValue, usableValueOverReplacement } from "./playerValue";
import type { BasePosition, OptimizedLineup, ReplacementLevels } from "./types";

export function canFill(player: Player, slot: string) {
  const eligible = new Set(player.eligibleSlots ?? []);
  if (slot === player.position || eligible.has(slot)) return true;
  if (slot === "FLEX") return ["RB", "WR", "TE"].includes(player.position);
  if (slot === "SUPERFLEX") return ["QB", "RB", "WR", "TE"].includes(player.position);
  if (slot === "RB/WR") return ["RB", "WR"].includes(player.position);
  if (slot === "WR/TE") return ["WR", "TE"].includes(player.position);
  return false;
}

function optimizeSlots(players: Player[], slots: string[], valueOf: (player: Player) => number) {
  const ordered = [...players].sort((a, b) => valueOf(b) - valueOf(a) || a.id.localeCompare(b.id));
  const limit = 1 << slots.length;
  type State = { value: number; picks: { playerIndex: number; slotIndex: number }[] };
  let states: Array<State | undefined> = Array(limit);
  states[0] = { value: 0, picks: [] };
  for (let playerIndex = 0; playerIndex < ordered.length; playerIndex++) {
    const next = states.slice();
    for (let mask = 0; mask < limit; mask++) {
      const state = states[mask];
      if (!state) continue;
      for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
        if (mask & (1 << slotIndex) || !canFill(ordered[playerIndex], slots[slotIndex])) continue;
        const nextMask = mask | (1 << slotIndex);
        const picks = [...state.picks, { playerIndex, slotIndex }];
        const value = state.value + valueOf(ordered[playerIndex]);
        const signature = picks.map((pick) => `${pick.slotIndex}:${ordered[pick.playerIndex].id}`).sort().join("|");
        const old = next[nextMask];
        const oldSignature = old?.picks.map((pick) => `${pick.slotIndex}:${ordered[pick.playerIndex].id}`).sort().join("|") ?? "";
        if (!old || value > old.value || (value === old.value && signature < oldSignature)) next[nextMask] = { value, picks };
      }
    }
    states = next;
  }
  const best = states.reduce<State>((current, candidate) => candidate && (candidate.picks.length > current.picks.length || (candidate.picks.length === current.picks.length && candidate.value > current.value)) ? candidate : current, { value: 0, picks: [] });
  return best.picks.map((pick) => ({ slot: slots[pick.slotIndex], slotIndex: pick.slotIndex, player: ordered[pick.playerIndex], seasonProjectedPoints: projectedValue(ordered[pick.playerIndex]) }));
}

export function optimizeLineup(players: Player[], slots: string[], valueOf = projectedValue): OptimizedLineup {
  const assignments = optimizeSlots(players, slots, valueOf).sort((a, b) => a.slotIndex - b.slotIndex);
  const used = new Set(assignments.map((assignment) => assignment.player.id));
  return { assignments, bench: players.filter((player) => !used.has(player.id)), totalSeasonProjectedPoints: assignments.reduce((sum, assignment) => sum + assignment.seasonProjectedPoints, 0) };
}

export function optimizeTeamLineup(league: League, players: Player[], replacements?: ReplacementLevels): OptimizedLineup {
  const slots = starterSlots(league);
  const required = slots.filter((slot) => !FLEX_SLOTS.has(slot));
  const flex = slots.filter((slot) => FLEX_SLOTS.has(slot));
  const valueOf = replacements
    ? (player: Player) => usableValueOverReplacement(player, replacements.byPosition[player.position as BasePosition] ?? 0)
    : projectedValue;
  const requiredAssignments = optimizeSlots(players, required, valueOf);
  const requiredIds = new Set(requiredAssignments.map((assignment) => assignment.player.id));
  const flexAssignments = optimizeSlots(players.filter((player) => !requiredIds.has(player.id)), flex, valueOf).map((assignment) => ({ ...assignment, slotIndex: assignment.slotIndex + required.length }));
  const assignments = [...requiredAssignments, ...flexAssignments].sort((a, b) => a.slotIndex - b.slotIndex);
  const used = new Set(assignments.map((assignment) => assignment.player.id));
  return { assignments, bench: players.filter((player) => !used.has(player.id)), totalSeasonProjectedPoints: assignments.reduce((sum, assignment) => sum + assignment.seasonProjectedPoints, 0) };
}
