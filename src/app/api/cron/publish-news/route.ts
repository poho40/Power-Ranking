import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedPublicationRequest } from "@/lib/supabase/publication";
import { supabaseSnapshotStore } from "@/lib/supabase/snapshots";
import { supabaseGeneratedArticleStore } from "@/lib/news/generated";
import { publishLatestNews } from "@/lib/news/publication";

export async function GET(request: NextRequest) {
  if (!isAuthorizedPublicationRequest(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const leagueId = process.env.ESPN_LEAGUE_ID;
  const season = Number(process.env.ESPN_SEASON);
  if (!leagueId || !Number.isInteger(season) || season <= 0) {
    return NextResponse.json({ status: "failed", reason: "configuration_error" }, { status: 503 });
  }
  try {
    const snapshots = supabaseSnapshotStore(), articles = supabaseGeneratedArticleStore();
    if (!snapshots || !articles) {
      return NextResponse.json({ status: "failed", reason: "supabase_unavailable" }, { status: 503 });
    }
    const result = await publishLatestNews(snapshots, articles, leagueId, season);
    console.info("News publication completed:", result);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    console.error("News publication failed during storage or validation.");
    return NextResponse.json({ status: "failed", reason: "article_publication_failed", message: "Saved rankings remain unchanged. Retry this job to publish the missing article." }, { status: 500 });
  }
}
