import type { PowerRanking, Team } from "@/lib/domain";
import type { PublishedSnapshot } from "@/lib/supabase/types";

const number = (value: number) => Number.isFinite(value) ? value : 0;

export function teamOutlook(snapshot: PublishedSnapshot<PowerRanking[]>, team: Team, ranking: PowerRanking) {
  const rows = snapshot.result;
  const average = rows.reduce((sum, row) => sum + number(row.pointsPerGame), 0) / rows.length;
  const ppg = number(ranking.pointsPerGame), difference = ppg - average;
  const allPlay = number(ranking.expectedWinPct) * 100;
  const roster = number(ranking.components.roster), luck = number(ranking.luck);
  const games = snapshot.league.matchups.filter(game => game.completed && game.week <= snapshot.week && (game.homeTeamId === team.id || game.awayTeamId === team.id));
  const sample = new Set(games.map(game => game.week)).size;
  const scoring = `${ppg.toFixed(1)} points per game, ${Math.abs(difference).toFixed(1)} ${difference >= 0 ? "above" : "below"} the league average of ${average.toFixed(1)}`;
  const high: string[] = [], low: string[] = [];

  if (difference >= 0) high.push(`The strongest argument for ${team.name} starts with production: ${scoring}. Scoring above the league's typical output gives this team a path to wins that does not depend solely on drawing a weak opponent.`);
  else low.push(`The offense is producing ${scoring}. That gap is the central concern: a favorable matchup can hide it in the standings, but it leaves less margin against stronger opponents.`);
  if (allPlay >= 50) high.push(`The ${allPlay.toFixed(1)}% all-play win rate means these scores would beat at least half the league across the recorded weekly comparisons, with ties counting as half a win. That supports the ranking beyond the actual schedule.`);
  else low.push(`An all-play win rate of ${allPlay.toFixed(1)}% means the recorded scores lose more league-wide comparisons than they win. The case for a climb needs better weekly output, not just a different opponent.`);
  if (roster >= 65) high.push(`A roster component of ${roster.toFixed(1)}/100 is another encouraging signal within this league. It gives us a reason to watch for more than the results already in the books, although that score is not a forecast of next week's points.`);
  else if (roster <= 35) low.push(`The roster component sits at ${roster.toFixed(1)}/100 relative to this league. The model offers limited roster-based support for a rebound; a higher ceiling still needs to show up in actual scoring.`);
  if (luck <= -0.25) high.push(`Matchup luck is ${luck.toFixed(2)} wins: actual results trail the all-play expectation. That makes the record a harsher verdict than the scoring comparisons, though it does not guarantee future wins.`);
  else if (luck >= 0.25) low.push(`Matchup luck is +${luck.toFixed(2)} wins, meaning the record has outperformed the all-play expectation. If opponent draws become less favorable, the same scoring could produce worse results.`);
  if (!high.length) high.push(`The optimistic case for ${team.name} is a recovery case, rather than a claim that the current results are strong. A roster component of ${roster.toFixed(1)}/100 and a scoring gap of ${Math.abs(difference).toFixed(1)} points per game show what needs to translate into better weeks; a move toward the league's ${average.toFixed(1)}-point average would be a concrete first step.`);
  if (!low.length) low.push(`The concern is how much of this level ${team.name} can sustain. A ${ppg.toFixed(1)}-point scoring average and ${allPlay.toFixed(1)}% all-play rate set a demanding standard; a drop toward the league's ${average.toFixed(1)}-point average would weaken the case for this position.`);
  low.push(sample <= 1
    ? "This is only a one-week sample. Scoring and recent form largely describe the same performance here, so they are not two independent pieces of evidence for a lasting trend."
    : `The evidence covers ${sample} completed weeks. Recent form is ${number(ranking.components.recentForm).toFixed(1)}/100 within the league, but a short run can still exaggerate both progress and decline.`);

  const right = difference < 0
    ? `If ${team.name} can close the ${Math.abs(difference).toFixed(1)}-point gap to the league average, stronger weekly scores would improve both the scoring and all-play case for moving up. ${roster >= 65 ? "The relatively strong roster score makes that a plausible scenario to watch, rather than something already proven." : "The first sign to look for is a better league-wide scoring finish, even if the next head-to-head result is unlucky."}`
    : `If ${team.name} keeps scoring around ${ppg.toFixed(1)} points while the league stays near ${average.toFixed(1)}, the offense can keep generating favorable all-play comparisons. ${luck < -0.25 ? "With less punishing opponent draws, that performance could turn into a better record without requiring a major scoring leap." : "Repeating that performance over more weeks would make the current ranking more convincing and strengthen the case to hold or improve it."}`;
  const wrong = luck >= 0.25
    ? `If the schedule stops helping, the +${luck.toFixed(2)}-win gap over all-play expectation could shrink. That is a scenario, not a prediction: the danger is that the record slips before the underlying ${ppg.toFixed(1)}-point average improves enough to compensate.`
    : difference < 0
      ? `If the offense remains below the ${average.toFixed(1)}-point league average, tougher opponent scores could turn the current weakness into more losses. A single bounce-back result would not resolve that concern unless the league-wide scoring comparisons improve too.`
      : `If scoring falls toward the league average, opponents would have more chances to beat this team and its all-play profile would soften. ${roster <= 35 ? "The low relative roster score adds to that concern: there is not much model support for assuming the scoring edge will automatically return." : "The warning sign would be repeated ordinary scoring weeks, even if a few favorable matchups keep the record looking healthy."}`;
  return { whyHigh: high.join(" "), whyLow: low.join(" "), couldGoRight: right, couldGoWrong: wrong };
}
