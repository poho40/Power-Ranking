import type { League, WeeklyTeamScore } from "@/lib/domain";
export function completedWeeks(league: League): number[] { return [...new Set(league.matchups.filter(m=>m.completed).map(m=>m.week))].sort((a,b)=>a-b); }
export function weeklyScores(league: League): WeeklyTeamScore[] { return league.matchups.filter(m=>m.completed).flatMap(m=>[{teamId:m.homeTeamId,week:m.week,score:m.homeScore},{teamId:m.awayTeamId,week:m.week,score:m.awayScore}]); }
export function scoresForTeam(league: League, teamId: string) { return weeklyScores(league).filter(s=>s.teamId===teamId).sort((a,b)=>a.week-b.week); }
export function leagueAverageByWeek(league: League) { const scores=weeklyScores(league); return completedWeeks(league).map(week=>{const values=scores.filter(s=>s.week===week).map(s=>s.score);return {week,average:values.length?values.reduce((a,b)=>a+b,0)/values.length:0};}); }
