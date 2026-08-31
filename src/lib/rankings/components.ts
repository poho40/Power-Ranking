import type { League } from "@/lib/domain";
import { calculateExpectedWins } from "./expectedWins";
import { normalizeMinMax } from "./normalization";
import { scoresForTeam } from "./weeklyScores";
export const pointsPerGame=(league:League,id:string)=>{const s=scoresForTeam(league,id);return s.length?s.reduce((a,b)=>a+b.score,0)/s.length:0};
const normalizedMap=(league:League,values:number[])=>Object.fromEntries(league.teams.map((t,i)=>[t.id,normalizeMinMax(values)[i]]));
export function scoringScores(l:League){return normalizedMap(l,l.teams.map(t=>pointsPerGame(l,t.id)));}
export function recentFormScores(l:League){const raw=l.teams.map(t=>{const s=scoresForTeam(l,t.id).slice(-3).reverse();const w=[.5,.3,.2].slice(0,s.length),sum=w.reduce((a,b)=>a+b,0);return s.reduce((n,x,i)=>n+x.score*w[i],0)/(sum||1)});return normalizedMap(l,raw);}
export function recordScores(l:League){return normalizedMap(l,l.teams.map(t=>{const g=t.wins+t.losses+t.ties;return g?(t.wins+.5*t.ties)/g:0}));}
export function expectedWinScores(l:League){return normalizedMap(l,l.teams.map(t=>calculateExpectedWins(l,t.id).expectedWinPct));}
export function rosterScores(l:League){const raw=l.teams.map(t=>{const starters=t.roster.filter(p=>p.slot!=="BE"),bench=t.roster.filter(p=>p.slot==="BE");const avg=(ps:typeof t.roster)=>ps.length?ps.reduce((s,p)=>s+(p.projectedPoints??p.fantasyPoints??0),0)/ps.length:0;return .8*avg(starters)+.2*avg(bench)});return normalizedMap(l,raw);}
export function scheduleScores(l:League){const ppg=Object.fromEntries(l.teams.map(t=>[t.id,pointsPerGame(l,t.id)]));const raw=l.teams.map(t=>{const opponents=l.matchups.filter(m=>m.completed&&(m.homeTeamId===t.id||m.awayTeamId===t.id)).map(m=>m.homeTeamId===t.id?m.awayTeamId:m.homeTeamId);return opponents.length?opponents.reduce((s,id)=>s+(ppg[id]??0),0)/opponents.length:0});return normalizedMap(l,raw);}
