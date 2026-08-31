import "server-only";
import { calculatePowerRankings } from "@/lib/rankings";
import { getLeague } from "./getLeague";
export async function getDashboard(){const result=await getLeague();if(!result.league)return{...result,rankings:[]};const latest=Math.max(...result.league.matchups.filter(m=>m.completed).map(m=>m.week),0);const priorLeague={...result.league,matchups:result.league.matchups.filter(m=>m.week<latest)};const prior=latest>1?Object.fromEntries(calculatePowerRankings(priorLeague).map(r=>[r.teamId,r.rank])):undefined;return{...result,rankings:calculatePowerRankings(result.league,prior)};}
