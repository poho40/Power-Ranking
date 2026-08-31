import type { League } from "@/lib/domain";
import { calculateExpectedWins } from "@/lib/rankings/expectedWins";
import { scoresForTeam } from "@/lib/rankings/weeklyScores";
import { standardDeviation } from "./leagueAnalytics";
export function teamAnalytics(l:League,id:string){const weekly=scoresForTeam(l,id),values=weekly.map(x=>x.score),expected=calculateExpectedWins(l,id);return {weekly,pointsPerGame:values.length?values.reduce((a,b)=>a+b,0)/values.length:0,deviation:standardDeviation(values),high:Math.max(...values,0),low:values.length?Math.min(...values):0,...expected};}
