import type { League } from "@/lib/domain";
import { calculateExpectedWins } from "./expectedWins";
import { pointsPerGame } from "./components";
export function scheduleLuck(l:League,id:string){const t=l.teams.find(x=>x.id===id);const e=calculateExpectedWins(l,id);return (t?.wins??0)+(t?.ties??0)*.5-e.expectedWins;}
export function remainingScheduleStrength(l:League,id:string){const future=l.matchups.filter(m=>!m.completed&&(m.homeTeamId===id||m.awayTeamId===id));if(!future.length)return null;return future.reduce((s,m)=>s+pointsPerGame(l,m.homeTeamId===id?m.awayTeamId:m.homeTeamId),0)/future.length;}
export interface PlayoffProjectionInput { teamId:string; wins:number; expectedWinPct:number; remainingGames:number }
export interface PlayoffProjectionResult extends PlayoffProjectionInput { projectedWins:number }
export function buildPlayoffProjectionInputs(l:League):PlayoffProjectionResult[]{return l.teams.map(t=>{const e=calculateExpectedWins(l,t.id),played=t.wins+t.losses+t.ties,remainingGames=Math.max(0,14-played);return {teamId:t.id,wins:t.wins,expectedWinPct:e.expectedWinPct,remainingGames,projectedWins:t.wins+t.ties*.5+remainingGames*e.expectedWinPct}});}
