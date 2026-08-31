import type { League, PowerRanking } from "@/lib/domain";
import type { PreseasonRankingsResult } from "@/lib/preseason";

export type SnapshotType = "preseason" | "regular";
export interface PublishedSnapshot<T = PowerRanking[] | PreseasonRankingsResult> { id:number;leagueId:string;leagueName:string;season:number;week:number;snapshotType:SnapshotType;label:string;publishedAt:string;league:League;result:T }
export interface PublishResult { snapshotId:number;created:boolean }
export interface SnapshotStore {
  publish(payload:Record<string,unknown>):Promise<PublishResult>;
  latest(leagueId:string,season:number,type?:SnapshotType):Promise<PublishedSnapshot|null>;
  byWeek(leagueId:string,season:number,week:number,type:SnapshotType):Promise<PublishedSnapshot|null>;
  all(leagueId:string,season:number):Promise<PublishedSnapshot[]>;
}
