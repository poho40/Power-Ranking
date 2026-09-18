import { describe, expect, it, vi } from "vitest";
import { mockLeague } from "@/data/mockLeague";
import { calculatePowerRankings } from "@/lib/rankings";
import { generateWeeklyRankingArticle } from "@/lib/news/weeklyArticle";
import { teamOutlook } from "@/lib/news/teamOutlook";
import { expandArticle } from "@/lib/news/expandArticle";
import type { PowerRanking } from "@/lib/domain";
import type { PublishedSnapshot, SnapshotStore } from "@/lib/supabase/types";

const league = { ...mockLeague, currentWeek: 1, matchups: mockLeague.matchups.filter(game => game.week === 1).map(game => ({ ...game, completed: true })) };
const snapshot: PublishedSnapshot<PowerRanking[]> = { id: 2, leagueId: league.id, leagueName: league.name, season: league.season, week: 1, snapshotType: "regular", label: "Week 1", publishedAt: "2026-09-15", league, result: calculatePowerRankings(league) };

describe("team outlook", () => {
  it("adds four substantial sections for every team using only the snapshot", () => {
    const original = structuredClone(snapshot);
    const article = generateWeeklyRankingArticle(snapshot);
    expect(article.generatedContent.rankings).toHaveLength(league.teams.length);
    for (const row of article.generatedContent.rankings) {
      expect(Object.values(row.outlook!).every(text => text.length > 100)).toBe(true);
      expect(row.outlook!.whyLow).toContain("one-week sample");
      expect(JSON.stringify(row.outlook)).not.toMatch(/NaN|Infinity/);
    }
    expect(snapshot).toEqual(original);
    expect(generateWeeklyRankingArticle(snapshot)).toEqual(article);
  });

  it("distinguishes strong scoring with bad luck from weak scoring with favorable luck", () => {
    const base = snapshot.result[0], team = league.teams.find(team => team.id === base.teamId)!;
    const strong = teamOutlook(snapshot, team, { ...base, pointsPerGame: 200, expectedWinPct: 0.9, luck: -0.75, components: { ...base.components, roster: 80 } });
    expect(strong.whyHigh).toContain("200.0 points per game");
    expect(strong.whyHigh).toContain("90.0% all-play");
    expect(strong.couldGoRight).toContain("less punishing opponent draws");
    const weak = teamOutlook(snapshot, team, { ...base, pointsPerGame: 10, expectedWinPct: 0.1, luck: 0.75, components: { ...base.components, roster: 20 } });
    expect(weak.whyHigh).toContain("recovery case");
    expect(weak.whyLow).toContain("10.0%");
    expect(weak.couldGoWrong).toContain("+0.75-win gap");
    expect(weak.couldGoRight).toContain("close the");
  });

  it("does not count future matchups toward the sample", () => {
    const row = snapshot.result[0], team = league.teams.find(team => team.id === row.teamId)!;
    const outlook = teamOutlook({ ...snapshot, league: { ...league, matchups: mockLeague.matchups.map(game => ({ ...game, completed: true })) } }, team, row);
    expect(outlook.whyLow).toContain("one-week sample");
  });
});

describe("existing article expansion", () => {
  const generated = { ...generateWeeklyRankingArticle(snapshot), id: 1 };
  const old = { ...generated, generatedContent: { ...generated.generatedContent, rankings: generated.generatedContent.rankings.map(row => ({ ...row, outlook: undefined })) } };

  it("expands Week 1 without changing the saved article or recalculating rankings", async () => {
    const original = structuredClone(old);
    const byWeek = vi.fn().mockResolvedValue(snapshot);
    const expanded = await expandArticle(old, { byWeek } as unknown as SnapshotStore, league.id);
    expect(byWeek).toHaveBeenCalledWith(league.id, league.season, 1, "regular");
    expect(expanded.generatedContent.rankings.every(row => row.outlook)).toBe(true);
    expect(expanded.slug).toBe(old.slug);
    expect(expanded.publishedAt).toBe(old.publishedAt);
    expect(expanded.generatedContent.rankings[0].explanation).toBe(old.generatedContent.rankings[0].explanation);
    expect(old).toEqual(original);
  });

  it("refuses to expand from a different snapshot", async () => {
    expect(await expandArticle(old, { byWeek: vi.fn().mockResolvedValue({ ...snapshot, id: 99 }) } as unknown as SnapshotStore, league.id)).toBe(old);
  });

  it("uses saved expanded content without fetching snapshots again", async () => {
    const byWeek = vi.fn();
    expect(await expandArticle(generated, { byWeek } as unknown as SnapshotStore, league.id)).toBe(generated);
    expect(byWeek).not.toHaveBeenCalled();
  });
});
