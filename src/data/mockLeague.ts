import type { League, Player } from "@/lib/domain";

const names = ["Fourth & Long","Gridiron Giants","Sunday Scaries","Red Zone Royals","Waiver Wizards","Blitz Brigade","End Zone Empire","Goal Line Stand","Hail Mary Heroes","Turf Titans"];
const abbreviations = ["FAL","GG","SS","RZR","WW","BB","EZE","GLS","HMH","TT"];
const weekly = [
  [141.4,128.1,119.7,133.2,110.5,124.6,102.4,116.8,108.2,97.5],
  [137.8,122.4,130.1,118.6,127.9,105.3,114.7,109.5,101.8,125.2],
  [129.5,144.2,116.3,121.8,135.1,112.7,126.4,98.9,120.5,107.6],
  [146.2,131.8,124.9,109.6,117.4,139.3,111.2,128.5,104.1,115.7],
  [134.7,119.5,142.1,127.3,106.8,122.6,136.9,113.4,125.8,100.2],
  [152.3,126.7,138.4,132.9,121.6,118.1,109.7,143.5,112.4,104.8],
];
const pairs = [[0,9],[1,8],[2,7],[3,6],[4,5],[0,8],[9,7],[1,6],[2,5],[3,4],[0,7],[8,6],[9,5],[1,4],[2,3],[0,6],[7,5],[8,4],[9,3],[1,2],[0,5],[6,4],[7,3],[8,2],[9,1],[0,4],[5,3],[6,2],[7,1],[8,9]];
function roster(team: number): Player[] {
  const slots = ["QB","RB","RB","WR","WR","TE","FLEX","D/ST","K","BE","BE","BE"];
  return slots.map((slot, i) => {const position=slot === "FLEX" ? "WR" : slot.replace("BE", i % 2 ? "RB" : "WR"),weekly=Math.max(2,20-i*.75+(9-team)*.25);return { id: `${team + 1}-${i + 1}`, name: `${["Avery","Jordan","Cameron","Riley","Morgan","Quinn","Hayden","Parker","Drew","Casey","Reese","Skyler"][i]} ${String.fromCharCode(65 + team)}.`, position, eligibleSlots:[position,...(["RB","WR","TE"].includes(position)?["FLEX"]:[])], proTeam: ["SF","BUF","DET","PHI","KC"][i % 5], slot, isStarter:slot!=="BE", weeklyActualPoints:Math.max(2,22-i*.9+team*.35),weeklyProjectedPoints:weekly,seasonActualPoints:0,seasonProjectedPoints:weekly*17 }});
}
const matchups = pairs.map(([home, away], i) => ({ week: Math.floor(i / 5) + 1, homeTeamId: String(home + 1), awayTeamId: String(away + 1), homeScore: weekly[Math.floor(i / 5)][home], awayScore: weekly[Math.floor(i / 5)][away], completed: true }));
export const mockLeague: League = { id: "demo-league", name: "Sunday Night Syndicate", season: 2026, currentWeek: 7, rosterSlotCounts:{QB:1,RB:2,WR:2,TE:1,FLEX:1,"D/ST":1,K:1,BE:3}, teams: names.map((name, i) => {
  const games = matchups.filter(m => m.homeTeamId === String(i+1) || m.awayTeamId === String(i+1));
  let wins=0, losses=0, ties=0, pointsAgainst=0;
  for (const m of games) { const home=m.homeTeamId===String(i+1); const own=home?m.homeScore:m.awayScore, opp=home?m.awayScore:m.homeScore; pointsAgainst+=opp; if(own>opp) wins++; else if(own<opp) losses++; else ties++; }
  return { id:String(i+1), name, abbreviation:abbreviations[i], wins, losses, ties, pointsFor:weekly.reduce((s,w)=>s+w[i],0), pointsAgainst, roster:roster(i) };
}), matchups };
