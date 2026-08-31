import type { League, PowerRanking, Team } from "@/lib/domain";
import { completedWeeks } from "@/lib/rankings/weeklyScores";

export type StandingsSortKey = "name" | "wins" | "pct" | "pointsFor" | "pointsAgainst" | "diff" | "expectedWins" | "luck" | "regularSeasonPowerRank";

export interface StandingsRow extends Team {
  pct: number;
  diff: number;
  expectedWins: number | null;
  luck: number | null;
  regularSeasonPowerRank: number | null;
}

export const canonicalTeamId = (id: string | number) => String(id);

export function buildStandingsRows(league: League, rankings: PowerRanking[]): StandingsRow[] {
  const hasRegularSeasonResults = completedWeeks(league).length > 0;
  const rankingByTeam = new Map(rankings.map((ranking) => [canonicalTeamId(ranking.teamId), ranking]));
  return league.teams.map((team) => {
    const analytics = hasRegularSeasonResults ? rankingByTeam.get(canonicalTeamId(team.id)) : undefined;
    const games = team.wins + team.losses + team.ties;
    return { ...team, pct: games ? (team.wins + 0.5 * team.ties) / games : 0, diff: team.pointsFor - team.pointsAgainst, expectedWins: analytics?.expectedWins ?? null, luck: analytics?.luck ?? null, regularSeasonPowerRank: analytics?.rank ?? null };
  });
}

export function sortStandingsRows(rows: StandingsRow[], key: StandingsSortKey, descending: boolean): StandingsRow[] {
  return rows.toSorted((a, b) => {
    const left = a[key], right = b[key];
    const leftMissing = left == null || (typeof left === "number" && !Number.isFinite(left));
    const rightMissing = right == null || (typeof right === "number" && !Number.isFinite(right));
    if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
    if (!leftMissing && !rightMissing) {
      const comparison = typeof left === "string" ? left.localeCompare(String(right)) : Number(left) - Number(right);
      if (comparison) return descending ? -comparison : comparison;
    }
    return a.name.localeCompare(b.name) || canonicalTeamId(a.id).localeCompare(canonicalTeamId(b.id));
  });
}
