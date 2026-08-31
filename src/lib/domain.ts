export interface Player { id: string; name: string; position: string; eligibleSlots?: string[]; proTeam?: string; fantasyPoints?: number; projectedPoints?: number; projectionSource?: "weekly"|"season-average"|"fallback"; slot?: string; isStarter?: boolean }
export interface Team { id: string; name: string; abbreviation?: string; logoUrl?: string; wins: number; losses: number; ties: number; pointsFor: number; pointsAgainst: number; roster: Player[] }
export interface Matchup { week: number; homeTeamId: string; awayTeamId: string; homeScore: number; awayScore: number; completed: boolean }
export interface League { id: string; name: string; season: number; currentWeek: number; teams: Team[]; matchups: Matchup[]; rosterSlotCounts?: Record<string,number> }
export interface WeeklyTeamScore { teamId: string; week: number; score: number }
export interface RankingComponents { scoring: number; recentForm: number; record: number; expectedWins: number; roster: number; schedule: number }
export interface PowerRanking { teamId: string; rank: number; previousRank?: number; rankChange?: number; powerScore: number; components: RankingComponents; pointsPerGame: number; expectedWins: number; expectedWinPct: number; luck: number; explanation: string }
export interface RankingSnapshot { leagueId: string; season: number; week: number; rankings: PowerRanking[] }
