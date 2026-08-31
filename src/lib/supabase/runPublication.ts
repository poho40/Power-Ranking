import "server-only";
import {getLeague} from "@/lib/data/getLeague";import {recordPublishSuccess} from "@/lib/health/status";import type {GeneratedArticleStore} from "@/lib/news/generated";import {publishLatestCompletedWeek} from "./publication";import type {SnapshotStore} from "./types";
export async function runLatestPublication(store:SnapshotStore,articles:GeneratedArticleStore,loadLeague:typeof getLeague=getLeague){
  console.info("Ranking publication started.");
  const live=await loadLeague({noStore:true});
  if(!live.league){const reason=live.errorCode==="AUTH"?"espn_authentication_failed":live.errorCode==="NETWORK"?"espn_network_failed":"espn_fetch_failed";console.warn(`Ranking publication aborted: ${reason}.`);return{ok:false as const,httpStatus:live.errorCode==="AUTH"?401:503,body:{status:"failed" as const,reason,message:live.errorCode==="AUTH"?"ESPN authentication failed. Published rankings were left unchanged.":"ESPN data could not be validated. Published rankings were left unchanged."}};}
  if(String(live.league.id)!==String(process.env.ESPN_LEAGUE_ID)){console.warn("Ranking publication aborted: league identity mismatch.");return{ok:false as const,httpStatus:422,body:{status:"failed" as const,reason:"league_identity_mismatch",message:"ESPN league identity did not match configuration. Published rankings were left unchanged."}};}
  console.info("ESPN fetch and league identity validation succeeded.");const result=await publishLatestCompletedWeek(store,live.league,articles);if(result.status==="published"||result.status==="article_repaired")void recordPublishSuccess().catch(()=>{});console.info(`Ranking publication completed: ${result.status}.`);return{ok:true as const,httpStatus:200,body:result};
}
