import "server-only";
import { mockLeague } from "@/data/mockLeague";
import type { League } from "@/lib/domain";
import { fetchEspnLeague, EspnServiceError } from "@/lib/espn/client";
import { parseEspnLeague } from "@/lib/espn/parser";
export interface LeagueResult { league?:League; source:"mock"|"espn"; error?:string }
export async function getLeague():Promise<LeagueResult>{if(process.env.DATA_SOURCE!=="espn")return{league:mockLeague,source:"mock"};const leagueId=process.env.ESPN_LEAGUE_ID,season=Number(process.env.ESPN_SEASON);if(!leagueId||!Number.isInteger(season))return{source:"espn",error:"Live mode requires ESPN_LEAGUE_ID and ESPN_SEASON."};try{return{league:parseEspnLeague(await fetchEspnLeague({leagueId,season,espnS2:process.env.ESPN_S2,espnSwid:process.env.ESPN_SWID})),source:"espn"}}catch(error){return{source:"espn",error:error instanceof EspnServiceError?error.message:"Unable to load league data."}}}
