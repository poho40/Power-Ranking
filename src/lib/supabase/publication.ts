import "server-only";
import type { League, PowerRanking } from "@/lib/domain";
import { calculatePreseasonRankings } from "@/lib/preseason";
import { calculatePowerRankings } from "@/lib/rankings";
import type { PreseasonRankingsResult } from "@/lib/preseason";
import { publishPreseasonSnapshot, publishRegularSnapshot } from "./snapshots";
import type { SnapshotStore } from "./types";

export function isAuthorizedPublicationRequest(authorization:string|null,secret:string|undefined){return Boolean(secret&&authorization===`Bearer ${secret}`)}
export function latestFullyCompletedWeek(league:League){const weeks=[...new Set(league.matchups.map(m=>m.week))];return Math.max(0,...weeks.filter(week=>{const games=league.matchups.filter(m=>m.week===week);return games.length>0&&games.every(game=>game.completed)}))}
export async function publishCurrentPreseason(store:SnapshotStore,league:League){return publishPreseasonSnapshot(store,league,calculatePreseasonRankings(league))}
export async function publishLatestCompletedWeek(store:SnapshotStore,league:League){const week=latestFullyCompletedWeek(league);if(!week)return{status:"no-completed-week" as const,week:0};const existing=await store.byWeek(league.id,league.season,week,"regular");if(existing)return{status:"already-published" as const,week,snapshotId:existing.id};const previous=(await store.all(league.id,league.season)).filter(s=>s.week<week).at(-1);let previousRanks:Record<string,number>|undefined;if(previous?.snapshotType==="regular")previousRanks=Object.fromEntries((previous.result as PowerRanking[]).map(r=>[r.teamId,r.rank]));else if(previous?.snapshotType==="preseason")previousRanks=Object.fromEntries((previous.result as PreseasonRankingsResult).rankings.map(r=>[r.teamId,r.rank]));const frozenLeague={...league,currentWeek:week,matchups:league.matchups.filter(m=>m.week<=week)};const rankings=calculatePowerRankings(frozenLeague,previousRanks);const result=await publishRegularSnapshot(store,frozenLeague,week,rankings);return{status:result.created?"published" as const:"already-published" as const,week,snapshotId:result.snapshotId}}
