const BASE="https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl";
export function leagueEndpoint(leagueId:string,season:number){if(!/^\d+$/.test(leagueId)||season<2000||season>2100)throw new Error("Invalid ESPN league configuration.");return `${BASE}/seasons/${season}/segments/0/leagues/${leagueId}?view=mTeam&view=mRoster&view=mMatchup&view=mSettings`}
