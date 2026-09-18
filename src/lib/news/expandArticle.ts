import type { PowerRanking } from "@/lib/domain";
import type { PublishedSnapshot, SnapshotStore } from "@/lib/supabase/types";
import type { GeneratedNewsArticle } from "./types";
import { teamOutlook } from "./teamOutlook";

// Older immutable articles gain the new sections from their exact saved snapshot.
// Preserve their original prose, identity, publication date, and movement analysis.
export async function expandArticle(article: GeneratedNewsArticle, snapshots: SnapshotStore, leagueId: string): Promise<GeneratedNewsArticle> {
  if (article.generatedContent.rankings.every(team => team.outlook)) return article;
  const snapshot = await snapshots.byWeek(leagueId, article.season, article.snapshotWeek!, "regular");
  if (!snapshot || snapshot.id !== article.snapshotId || snapshot.snapshotType !== "regular") return article;
  const regular = snapshot as PublishedSnapshot<PowerRanking[]>;
  const rankings = article.generatedContent.rankings.map(row => {
    if (row.outlook) return row;
    const team = regular.league.teams.find(team => String(team.id) === row.teamId);
    const ranking = regular.result.find(ranking => String(ranking.teamId) === row.teamId);
    return team && ranking ? { ...row, outlook: teamOutlook(regular, team, ranking) } : row;
  });
  return { ...article, generatedContent: { ...article.generatedContent, rankings } };
}
