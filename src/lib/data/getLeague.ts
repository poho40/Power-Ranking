import "server-only";import {mockLeague} from "@/data/mockLeague";import type {League} from "@/lib/domain";import {fetchEspnLeague,EspnServiceError,type EspnErrorCode} from "@/lib/espn/client";import {parseEspnLeague} from "@/lib/espn/parser";import {recordEspnFailure,recordEspnSuccess} from "@/lib/health/status";
export interface LeagueResult{league?:League;source:"mock"|"espn";error?:string;errorCode?:EspnErrorCode;healthPersisted?:boolean}
interface GetLeagueOptions{noStore?:boolean;fetchLeague?:typeof fetchEspnLeague;recordSuccess?:typeof recordEspnSuccess;recordFailure?:typeof recordEspnFailure}
export async function getLeague({noStore=false,fetchLeague=fetchEspnLeague,recordSuccess=recordEspnSuccess,recordFailure=recordEspnFailure}:GetLeagueOptions={}):Promise<LeagueResult>{
  if(process.env.DATA_SOURCE!=="espn")return{league:mockLeague,source:"mock"};
  const leagueId=process.env.ESPN_LEAGUE_ID,season=Number(process.env.ESPN_SEASON),espnS2=process.env.ESPN_S2,espnSwid=process.env.ESPN_SWID;
  if(!leagueId||!Number.isInteger(season)||!espnS2||!espnSwid){let healthPersisted=false;try{healthPersisted=await recordFailure("CONFIG")}catch{}return{source:"espn",error:"Live mode requires complete server-side ESPN configuration.",errorCode:"CONFIG",healthPersisted}}
  let league:League;try{league=parseEspnLeague(await fetchLeague({leagueId,season,espnS2,espnSwid},{noStore}))}catch(error){const typed=error instanceof EspnServiceError?error:new EspnServiceError("Unable to load league data.","MALFORMED",502);let healthPersisted=false;try{healthPersisted=await recordFailure(typed.code)}catch{}return{source:"espn",error:typed.message,errorCode:typed.code,healthPersisted}}
  let healthPersisted=false;try{healthPersisted=await recordSuccess()}catch{}return{league,source:"espn",healthPersisted};
}
