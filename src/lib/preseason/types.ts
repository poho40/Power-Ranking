import type { Player } from "@/lib/domain";
export type BasePosition="QB"|"RB"|"WR"|"TE"|"K"|"D/ST";
export type PreseasonGroup=BasePosition|"FLEX"|"Bench";
export interface LineupAssignment { slot:string; slotIndex:number; player:Player; seasonProjectedPoints:number }
export interface OptimizedLineup { assignments:LineupAssignment[]; bench:Player[]; totalSeasonProjectedPoints:number }
export interface ReplacementLevels { byPosition:Partial<Record<BasePosition,number>>; demand:Partial<Record<BasePosition,number>> }
export interface PreseasonPlayerContribution { playerId:string; name:string; position:string; seasonProjectedPoints:number; replacementLevel:number; rawVOR:number; usableVOR:number; contributionMultiplier:number; finalContribution:number; assignedSlot?:string; role:"starter"|"flex"|"depth" }
export interface PositionGroupRanking { group:PreseasonGroup; teamId:string; rank:number; score:number; rawValue:number; starterValue:number; depthValue:number; starterScore:number; depthScore:number; topStarterValue:number; firstDepthValue:number; totalUsefulDepthValue:number; players:PreseasonPlayerContribution[]; explanation:string }
export interface PreseasonTeamRanking { teamId:string; rank:number; overallScore:number; overallRawValue:number; positionGroups:Partial<Record<PreseasonGroup,PositionGroupRanking>>; projectedLineup:LineupAssignment[]; bench:Player[]; contributions:PreseasonPlayerContribution[]; totalStarterValue:number; totalBenchValue:number; skillValue:number; explanation:string }
export interface PreseasonRankingsResult { rankings:PreseasonTeamRanking[]; groups:PreseasonGroup[]; groupRankings:Partial<Record<PreseasonGroup,PositionGroupRanking[]>>; replacementLevels:ReplacementLevels; weights:Partial<Record<PreseasonGroup,number>>; awards:PreseasonAward[] }
export interface PreseasonAward { id:string; label:string; teamId:string; detail:string }
