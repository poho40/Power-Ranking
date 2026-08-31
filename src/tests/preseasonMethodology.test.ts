import { describe, expect, it } from "vitest";
import type { League, Player, Team } from "@/lib/domain";
import { BENCH_MULTIPLIERS, calculatePositionGroups, calculatePreseasonRankings, calculateReplacementLevels, playerContribution, positionDepthMultiplier } from "@/lib/preseason";

const player = (id: string, position: string, points: number): Player => ({ id, name: id, position, seasonProjectedPoints: points, eligibleSlots: [position, ...(["RB", "WR", "TE"].includes(position) ? ["FLEX"] : [])] });
const team = (id: string, roster: Player[]): Team => ({ id, name: `Team ${id}`, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0, roster });
const league = (teams: Team[], slots: Record<string, number>): League => ({ id: "method", name: "Method", season: 2026, currentWeek: 1, teams, matchups: [], rosterSlotCounts: slots });

describe("precise preseason VOR methodology", () => {
  it("stores raw negative VOR but gives it zero usable contribution", () => {
    const contribution = playerContribution(player("below", "RB", 40), { byPosition: { RB: 50 }, demand: { RB: 2 } }, "depth", 0.5);
    expect(contribution).toMatchObject({ rawVOR: -10, usableVOR: 0, contributionMultiplier: 0.5, finalContribution: 0 });
  });

  it("uses the 50/25/12.5 positional depth curve", () => {
    expect([0, 1, 2, 3].map(positionDepthMultiplier)).toEqual([0.5, 0.25, 0.125, 0.0625]);
  });

  it("uses the specified bench curve and a five-percent tail", () => {
    expect(BENCH_MULTIPLIERS).toEqual([0.5, 0.35, 0.25, 0.15, 0.1]);
    const replacements = { byPosition: { RB: 0 }, demand: { RB: 1 } };
    expect(playerContribution(player("sixth", "RB", 20), replacements, "depth", 0.05).finalContribution).toBe(1);
  });

  it("values elite starters above a larger pile of mediocre depth", () => {
    const l = league([
      team("A", [player("A1", "RB", 130), player("A2", "RB", 70), player("A3", "RB", 30)]),
      team("B", [player("B1", "RB", 70), player("B2", "RB", 60), player("B3", "RB", 40), player("B4", "RB", 35), player("B5", "RB", 25)]),
    ], { RB: 2, BE: 3 });
    const rows = calculatePositionGroups(l, { byPosition: { RB: 0 }, demand: { RB: 4 } }).RB!;
    expect(rows.find((row) => row.teamId === "A")?.rawValue).toBe(215);
    expect(rows.find((row) => row.teamId === "B")?.rawValue).toBe(161.875);
    expect(rows[0].teamId).toBe("A");
  });

  it.each(["RB", "WR", "TE"])("gives required %s starters full credit and depth half credit", (position) => {
    const l = league([team("A", [player("starter", position, 100), player("reserve", position, 40)]), team("B", [player("other-starter", position, 80), player("other-reserve", position, 20)])], { [position]: 1, BE: 1 });
    const rows = calculatePositionGroups(l, { byPosition: { [position]: 0 }, demand: { [position]: 2 } });
    const row = rows[position as "RB" | "WR" | "TE"]!.find((entry) => entry.teamId === "A")!;
    expect(row.starterValue).toBe(100);
    expect(row.depthValue).toBe(20);
    expect(row.rawValue).toBe(120);
  });

  it("partitions required starters and FLEX without double counting", () => {
    const l = league([
      team("A", [player("rb1", "RB", 100), player("rb2", "RB", 90), player("wr1", "WR", 80), player("wr2", "WR", 70)]),
      team("B", [player("br1", "RB", 60), player("br2", "RB", 50), player("bw1", "WR", 40), player("bw2", "WR", 30)]),
    ], { RB: 1, WR: 1, FLEX: 1, BE: 1 });
    const result = calculatePreseasonRankings(l);
    const a = result.rankings.find((row) => row.teamId === "A")!;
    expect(new Set(a.projectedLineup.map((assignment) => assignment.player.id)).size).toBe(3);
    expect(new Set(a.contributions.map((contribution) => contribution.playerId)).size).toBe(a.contributions.length);
    const flexId = a.contributions.find((contribution) => contribution.role === "flex")!.playerId;
    expect(a.positionGroups.RB?.players.some((entry) => entry.playerId === flexId)).toBe(false);
    expect(a.positionGroups.WR?.players.some((entry) => entry.playerId === flexId)).toBe(false);
    expect(a.overallRawValue).toBeCloseTo(a.contributions.reduce((sum, contribution) => sum + contribution.finalContribution, 0));
  });

  it("gives the second starting quarterback full credit in 2-QB and Superflex formats", () => {
    for (const slots of [{ QB: 2, BE: 1 }, { QB: 1, SUPERFLEX: 1, BE: 1 }] as Record<string, number>[]) {
      const l = league([team("A", [player("q1", "QB", 100), player("q2", "QB", 90), player("q3", "QB", 20)]), team("B", [player("bq1", "QB", 80), player("bq2", "QB", 70), player("bq3", "QB", 10)])], slots);
      const result = calculatePreseasonRankings(l).rankings.find((row) => row.teamId === "A")!;
      expect(result.contributions.filter((entry) => entry.position === "QB" && entry.assignedSlot).map((entry) => entry.contributionMultiplier)).toEqual([1, 1]);
    }
  });

  it("moves the QB replacement line deeper when Superflex creates more demand", () => {
    const teams = Array.from({ length: 4 }, (_, index) => team(String(index), [player(`${index}-q1`, "QB", 100 - index), player(`${index}-q2`, "QB", 80 - index), player(`${index}-r`, "RB", 20)]));
    const standard = calculateReplacementLevels(league(teams, { QB: 1, RB: 1, BE: 1 }));
    const superflex = calculateReplacementLevels(league(teams, { QB: 1, RB: 1, SUPERFLEX: 1, BE: 1 }));
    expect(superflex.demand.QB).toBeGreaterThan(standard.demand.QB!);
    expect(superflex.byPosition.QB).toBeLessThan(standard.byPosition.QB!);
  });

  it("normalizes equal raw values to 50 and keeps deterministic alphabetical ties", () => {
    const l = league([team("B", [player("b", "RB", 10)]), team("A", [player("a", "RB", 10)])], { RB: 1 });
    const result = calculatePreseasonRankings(l);
    expect(result.rankings.map((row) => row.overallScore)).toEqual([50, 50]);
    expect(result.rankings[0].teamId).toBe("A");
    expect(result.groupRankings.RB?.map((row) => row.teamId)).toEqual(["A", "B"]);
  });
});
