import type { League } from "@/lib/domain";
import { normalizeMinMax } from "@/lib/rankings/normalization";
import { FLEX_SLOTS } from "./config";
import { benchMultiplier, orderedPlayers, playerContribution } from "./contributions";
import { preseasonExplanation } from "./explanations";
import { optimizeTeamLineup } from "./lineupOptimizer";
import { calculatePositionGroups } from "./positionGroups";
import { calculateReplacementLevels } from "./replacementLevel";
import { preseasonAwards } from "./awards";
import type { PreseasonTeamRanking } from "./types";
import { generatePreseasonWeights } from "./weights";

export function calculatePreseasonRankings(league: League) {
  const replacementLevels = calculateReplacementLevels(league);
  const groupRankings = calculatePositionGroups(league, replacementLevels);
  const weights = generatePreseasonWeights(league); // Explanatory format context only; never used in Overall.
  const groups = Object.keys(weights) as (keyof typeof weights)[];
  const rawRows = league.teams.map((team) => {
    const positionGroups = Object.fromEntries(groups.flatMap((group) => {
      const row = groupRankings[group]?.find((candidate) => candidate.teamId === team.id);
      return row ? [[group, row]] : [];
    }));
    const lineup = optimizeTeamLineup(league, team.roster, replacementLevels);
    const starterContributions = lineup.assignments.map((assignment) => playerContribution(assignment.player, replacementLevels, FLEX_SLOTS.has(assignment.slot) ? "flex" : "starter", 1, assignment.slot));
    const benchContributions = orderedPlayers(lineup.bench, replacementLevels).map((player, index) => playerContribution(player, replacementLevels, "depth", benchMultiplier(index)));
    const totalStarterValue = starterContributions.reduce((sum, player) => sum + player.finalContribution, 0);
    const totalBenchValue = benchContributions.reduce((sum, player) => sum + player.finalContribution, 0);
    const overallRawValue = totalStarterValue + totalBenchValue;
    return { teamId: team.id, positionGroups, projectedLineup: lineup.assignments, bench: lineup.bench, contributions: [...starterContributions, ...benchContributions], totalStarterValue, totalBenchValue, overallRawValue, skillValue: overallRawValue };
  });
  const overallScores = normalizeMinMax(rawRows.map((row) => row.overallRawValue));
  const rows: PreseasonTeamRanking[] = rawRows.map((row, index) => ({ ...row, rank: 0, overallScore: Number(overallScores[index].toFixed(1)), explanation: "" }))
    .sort((a, b) => b.overallRawValue - a.overallRawValue || b.totalStarterValue - a.totalStarterValue || b.totalBenchValue - a.totalBenchValue || league.teams.find((team) => team.id === a.teamId)!.name.localeCompare(league.teams.find((team) => team.id === b.teamId)!.name));
  const rankings = rows.map((row, index) => {
    const ranked = { ...row, rank: index + 1 };
    return { ...ranked, explanation: preseasonExplanation(ranked, league) };
  });
  return { rankings, groups, groupRankings, replacementLevels, weights, awards: preseasonAwards(rankings, groups, league) };
}
