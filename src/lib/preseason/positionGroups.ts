import type { League, Team } from "@/lib/domain";
import { normalizeMinMax } from "@/lib/rankings/normalization";
import { applicableGroups, FLEX_SLOTS } from "./config";
import { benchMultiplier, playerContribution, positionDepthMultiplier, usefulPlayers } from "./contributions";
import { optimizeTeamLineup } from "./lineupOptimizer";
import type { PositionGroupRanking, PreseasonGroup, ReplacementLevels } from "./types";

function groupRaw(team: Team, league: League, group: PreseasonGroup, replacements: ReplacementLevels) {
  const lineup = optimizeTeamLineup(league, team.roster, replacements);
  const assigned = new Set(lineup.assignments.map((assignment) => assignment.player.id));

  if (group === "Bench") {
    const players = usefulPlayers(lineup.bench, replacements).map((player, index) => playerContribution(player, replacements, "depth", benchMultiplier(index)));
    const depthValue = players.reduce((sum, player) => sum + player.finalContribution, 0);
    return { rawValue: depthValue, starterValue: 0, depthValue, topStarterValue: 0, firstDepthValue: players[0]?.usableVOR ?? 0, totalUsefulDepthValue: players.reduce((sum, player) => sum + player.usableVOR, 0), players, lineup };
  }

  if (group === "FLEX") {
    const players = lineup.assignments
      .filter((assignment) => FLEX_SLOTS.has(assignment.slot))
      .map((assignment) => playerContribution(assignment.player, replacements, "flex", 1, assignment.slot))
      .sort((a, b) => b.usableVOR - a.usableVOR || a.name.localeCompare(b.name));
    const starterValue = players.reduce((sum, player) => sum + player.finalContribution, 0);
    return { rawValue: starterValue, starterValue, depthValue: 0, topStarterValue: players[0]?.usableVOR ?? 0, firstDepthValue: 0, totalUsefulDepthValue: 0, players, lineup };
  }

  const starters = lineup.assignments
    .filter((assignment) => assignment.player.position === group && !FLEX_SLOTS.has(assignment.slot))
    .map((assignment) => playerContribution(assignment.player, replacements, "starter", 1, assignment.slot))
    .sort((a, b) => b.usableVOR - a.usableVOR || a.name.localeCompare(b.name));
  const depth = usefulPlayers(team.roster.filter((player) => player.position === group && !assigned.has(player.id)), replacements)
    .map((player, index) => playerContribution(player, replacements, "depth", positionDepthMultiplier(index)));
  const starterValue = starters.reduce((sum, player) => sum + player.finalContribution, 0);
  const depthValue = depth.reduce((sum, player) => sum + player.finalContribution, 0);
  return {
    rawValue: starterValue + depthValue,
    starterValue,
    depthValue,
    topStarterValue: starters[0]?.usableVOR ?? 0,
    firstDepthValue: depth[0]?.usableVOR ?? 0,
    totalUsefulDepthValue: depth.reduce((sum, player) => sum + player.usableVOR, 0),
    players: [...starters, ...depth],
    lineup,
  };
}

export function calculatePositionGroups(league: League, replacements: ReplacementLevels) {
  const result: Partial<Record<PreseasonGroup, PositionGroupRanking[]>> = {};
  for (const group of applicableGroups(league)) {
    const raw = league.teams.map((team) => ({ team, data: groupRaw(team, league, group, replacements) }));
    const scores = normalizeMinMax(raw.map((entry) => entry.data.rawValue));
    const starterScores = normalizeMinMax(raw.map((entry) => entry.data.starterValue));
    const depthScores = normalizeMinMax(raw.map((entry) => entry.data.depthValue));
    const rows = raw.map((entry, index) => ({ group, teamId: entry.team.id, rank: 0, score: scores[index], starterScore: starterScores[index], depthScore: depthScores[index], ...entry.data, explanation: "" }))
      .sort((a, b) => b.rawValue - a.rawValue || b.topStarterValue - a.topStarterValue || b.starterValue - a.starterValue || b.firstDepthValue - a.firstDepthValue || b.totalUsefulDepthValue - a.totalUsefulDepthValue || league.teams.find((team) => team.id === a.teamId)!.name.localeCompare(league.teams.find((team) => team.id === b.teamId)!.name));
    result[group] = rows.map((row, index) => ({ ...row, rank: index + 1, explanation: groupExplanation(group, index + 1, row.score, row.starterValue, row.depthValue) }));
  }
  return result;
}

function groupExplanation(group: PreseasonGroup, rank: number, score: number, starters: number, depth: number) {
  if (rank === 1) return `The league's strongest ${group} profile combines full-credit starter VOR with discounted useful depth.`;
  if (depth > starters * 0.45) return `Useful diminishing depth lifts this ${group} group to #${rank}.`;
  if (score < 35) return `Limited usable VOR places this ${group} group below the league average.`;
  return `Full-credit starter VOR and diminishing depth rank this ${group} profile #${rank}.`;
}
