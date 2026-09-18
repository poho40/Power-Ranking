import type { PowerRanking } from "@/lib/domain";
import type { PublishedSnapshot, SnapshotStore } from "@/lib/supabase/types";
import type { GeneratedNewsArticle } from "./types";
import { generateWeeklyRankingArticle } from "./weeklyArticle";

// Refresh older editorial copy from its exact snapshot; preserve identity and date.
export async function expandArticle(article: GeneratedNewsArticle, snapshots: SnapshotStore, leagueId: string): Promise<GeneratedNewsArticle> {
  if (article.generatedContent.editorialVersion === 2 && article.generatedContent.rankings.every(team => team.outlook)) return article;
  const snapshot = await snapshots.byWeek(leagueId, article.season, article.snapshotWeek!, "regular");
  if (!snapshot || snapshot.id !== article.snapshotId || snapshot.snapshotType !== "regular") return article;
  const regular = snapshot as PublishedSnapshot<PowerRanking[]>;
  const previous = (await snapshots.all(leagueId, article.season))
    .filter(row => row.snapshotType === "regular" && row.week < regular.week)
    .sort((a,b) => b.week - a.week)[0] as PublishedSnapshot<PowerRanking[]> | undefined;
  const refreshed = generateWeeklyRankingArticle(regular, previous);
  return { ...article, summary: refreshed.summary, generatedContent: refreshed.generatedContent };
}
