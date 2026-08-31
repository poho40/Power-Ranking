export type ArticleStatus="draft"|"published";
export interface NewsArticleMeta { title:string;slug:string;season:number;week?:number;publishedAt:string;summary:string;status:ArticleStatus;heroLabel?:string;author?:string;featuredTeamIds?:string[];tags?:string[] }
export interface NewsArticle extends NewsArticleMeta { body:string }
export type StoryReasonCode="STRONG_RECENT_FORM"|"WEAK_RECENT_FORM"|"NEGATIVE_LUCK"|"POSITIVE_LUCK"|"HIGH_EXPECTED_WINS"|"LOW_EXPECTED_WINS"|"RANKING_RISER"|"RANKING_FALLER"|"ABOVE_AVERAGE_SCORING"|"BELOW_AVERAGE_SCORING"|"STRONG_ROSTER"|"STRONG_RECORD";
export interface TeamStoryCandidate { teamId:string;teamName:string;powerRank:number;previousRank?:number;rankChange?:number;record:string;pointsPerGame:number;expectedWins:number;luck:number;recentFormScore:number;reasonCodes:StoryReasonCode[];signalScore:number }
export interface MatchupStoryCandidate { week:number;homeTeamId:string;awayTeamId:string;homeTeamName:string;awayTeamName:string;homePowerRank:number;awayPowerRank:number;rankDistance:number }
export interface WeeklyEditorialBrief { season:number;week:number;highOn:TeamStoryCandidate[];lowOn:TeamStoryCandidate[];fraudWatch:TeamStoryCandidate[];buyLow:TeamStoryCandidate[];sellHigh:TeamStoryCandidate[];biggestRiser?:TeamStoryCandidate;biggestFaller?:TeamStoryCandidate;matchupOfTheWeek?:MatchupStoryCandidate }
