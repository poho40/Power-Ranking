import "server-only";
import { mockLeague } from "@/data/mockLeague";
import type { League,PowerRanking } from "@/lib/domain";
import { calculatePreseasonRankings,type PreseasonRankingsResult } from "@/lib/preseason";
import { calculatePowerRankings } from "@/lib/rankings";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getLatestPublishedSnapshot,getPreseasonPublishedSnapshot } from "@/lib/supabase/snapshots";
import type { PublishedSnapshot } from "@/lib/supabase/types";
import { getLeague } from "./getLeague";

export interface PublishedDashboardResult {league?:League;source:"mock"|"espn";error?:string;rankings:PowerRanking[];rankingLeague?:League;preseason?:PreseasonRankingsResult;snapshot?:PublishedSnapshot;fallback?:boolean}
export interface PublishedPreseasonResult {league?:League;source:"mock"|"espn";error?:string;preseason?:PreseasonRankingsResult;snapshot?:PublishedSnapshot;fallback?:boolean}
const developmentFallback=()=>process.env.DATA_SOURCE==="mock"||process.env.SNAPSHOT_DEV_FALLBACK==="true"||process.env.NODE_ENV!=="production";
function configuredIdentity(){if(process.env.DATA_SOURCE!=="espn")return{id:mockLeague.id,season:mockLeague.season,source:"mock" as const};const season=Number(process.env.ESPN_SEASON);return{id:process.env.ESPN_LEAGUE_ID,season:Number.isInteger(season)?season:undefined,source:"espn" as const}}

export async function getPublishedDashboard():Promise<PublishedDashboardResult>{
  const identity=configuredIdentity();
  let snapshot:PublishedSnapshot|null=null,snapshotError:string|undefined;try{snapshot=identity.id&&identity.season?await getLatestPublishedSnapshot(identity.id,identity.season):null}catch(error){snapshotError=error instanceof Error?error.message:"Published snapshot lookup failed."}
  const live=await getLeague();
  if(snapshot){const league=live.league??snapshot.league;if(snapshot.snapshotType==="regular")return{league,source:identity.source,rankings:snapshot.result as PowerRanking[],snapshot,rankingLeague:snapshot.league};return{league,source:identity.source,rankings:[],preseason:snapshot.result as PreseasonRankingsResult,snapshot,rankingLeague:snapshot.league}}
  if(live.league&&developmentFallback())return{...live,rankings:calculatePowerRankings(live.league),preseason:calculatePreseasonRankings(live.league),rankingLeague:live.league,fallback:true};
  return{league:live.league,source:identity.source,rankings:[],error:snapshotError??(isSupabaseConfigured()?"No published ranking snapshot exists for this league and season.":"Published rankings are unavailable because Supabase is not configured.")};
}

export async function getPublishedPreseason():Promise<PublishedPreseasonResult>{
  const identity=configuredIdentity();
  let snapshot:PublishedSnapshot|null=null,snapshotError:string|undefined;try{snapshot=identity.id&&identity.season?await getPreseasonPublishedSnapshot(identity.id,identity.season):null}catch(error){snapshotError=error instanceof Error?error.message:"Published preseason lookup failed."}
  if(snapshot)return{league:snapshot.league,source:identity.source,preseason:snapshot.result as PreseasonRankingsResult,snapshot};
  const live=await getLeague();
  if(live.league&&developmentFallback())return{...live,preseason:calculatePreseasonRankings(live.league),fallback:true};
  return{source:identity.source,error:snapshotError??(isSupabaseConfigured()?"The preseason snapshot has not been published.":"Published preseason rankings are unavailable because Supabase is not configured.")};
}
