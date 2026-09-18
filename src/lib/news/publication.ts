import "server-only";
import type { PowerRanking } from "@/lib/domain";
import type { PublishedSnapshot, SnapshotStore } from "@/lib/supabase/types";
import type { GeneratedArticleStore } from "./generated";
import { generateWeeklyRankingArticle } from "./weeklyArticle";

export async function publishLatestNews(
  snapshots: SnapshotStore,
  articles: GeneratedArticleStore,
  leagueId: string,
  season: number,
) {
  const snapshot = await snapshots.latest(leagueId, season, "regular");
  if (!snapshot) return { status: "no-published-snapshot" as const };
  const existing = await articles.bySnapshot(snapshot.id);
  if (existing) return { status: "already_published" as const, week: snapshot.week, snapshotId: snapshot.id, articleSlug: existing.slug };

  const previous = (await snapshots.all(leagueId, season))
    .filter(row => row.snapshotType === "regular" && row.week < snapshot.week)
    .sort((a, b) => b.week - a.week)[0];
  const article = generateWeeklyRankingArticle(
    snapshot as PublishedSnapshot<PowerRanking[]>,
    previous as PublishedSnapshot<PowerRanking[]> | undefined,
  );
  const result = await articles.publish(article, leagueId);
  return { status: result.created ? "published" as const : "already_published" as const, week: snapshot.week, snapshotId: snapshot.id, articleSlug: result.article.slug };
}
