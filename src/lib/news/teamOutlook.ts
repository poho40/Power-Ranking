import type { PowerRanking, Team } from "@/lib/domain";
import type { PublishedSnapshot } from "@/lib/supabase/types";

export function teamOutlook(snapshot: PublishedSnapshot<PowerRanking[]>, team: Team, ranking: PowerRanking) {
  const average = snapshot.result.reduce((sum, row) => sum + row.pointsPerGame, 0) / snapshot.result.length;
  const strong = ranking.pointsPerGame >= average;
  const convincing = ranking.expectedWinPct >= 0.65;
  const roster = ranking.components.roster;
  const unlucky = ranking.luck <= -0.25, fortunate = ranking.luck >= 0.25;
  const early = new Set(snapshot.league.matchups.filter(game => game.completed && game.week <= snapshot.week && (game.homeTeamId === team.id || game.awayTeamId === team.id)).map(game => game.week)).size <= 1;
  const high = convincing
    ? `We like ${team.name} because the scoring gives the rest of the league something to worry about. This is the kind of team you would rather see on somebody else's schedule. ${unlucky ? "The results have been a little unfair, too. We would be much more worried about facing this team than its record might suggest." : "There is a good case for taking them seriously even if you ignore the standings entirely."}`
    : strong
      ? `${team.name} has done enough to keep us interested. We are not ready to hand out a trophy, but there is something to work with here: they can put up a score that makes an opponent earn the win. ${roster >= 65 ? "We like the roster enough to believe there could be another gear." : "For now, that is a better reason for optimism than simply hoping the next opponent has a bad week."}`
      : roster >= 65
        ? `We are not ready to give up on ${team.name}. The results have been disappointing, but we like the roster more than the scoring so far. This feels like a team that could make a gloomy early verdict look silly if things start coming together. We want to see it happen before buying all the way in.`
        : `The best case for ${team.name} is that there is still room to change the story. We would rather leave the door open for a response than write the season off here. That is cautious optimism, though: we need to see a performance that makes the rest of the league pay attention.`;
  let low = fortunate
    ? `We are less sold than the record might suggest. The matchups have been kind, and that can make a team look more comfortable than it really is. ${strong ? "There is good scoring here, so this is not a dismissal. We just would not assume every close call will keep breaking their way." : "Our worry is what happens when an opponent shows up with a decent week. There has not been enough scoring to make that feel like a comfortable assignment."}`
    : !strong
      ? `It is hard to feel comfortable backing a team that keeps giving its opponent room to breathe. ${roster >= 65 ? "We can talk ourselves into the roster, but potential only buys so much patience. At some point, the good version of this team has to show up." : "We need a reason to expect more than a favorable matchup. Right now, the scoring leaves us asking where the next convincing win comes from."}`
      : roster <= 35
        ? `We like what has hit the scoreboard more than we like the cushion behind it. If the scoring cools off, we are not convinced this roster will make the dip painless. That keeps us from treating a good start as a settled verdict.`
        : `The question is whether this is the version of ${team.name} we should expect most weeks. It is easy to fall in love with a team when the scoreboard looks good. We want to know what an ordinary week looks like before we stop worrying.`;
  if (early) low += " It is only Week 1. We can have a take without pretending we have the whole season figured out.";
  const right = unlucky
    ? `The good version of this story does not require a complete reinvention. Keep giving opponents a difficult score to chase and get a less brutal draw, and the results could start looking a lot more flattering. We would not be surprised if the conversation around this team changed before much else did.`
    : !strong
      ? roster >= 65
        ? `The roster starts delivering the kind of weeks we think it is capable of, and suddenly this looks like a slow start rather than a bad team. A convincing bounce-back would go a long way toward getting us back on board. We would much rather see that than an ugly win that answers nothing.`
        : `They put together a week that is good enough to beat a strong opponent, not just survive a quiet one. That would give us something real to get behind. The climb does not have to happen all at once; first, make the next team on the schedule a little nervous.`
      : `They back this up, and we stop treating a good performance like something that needs explaining away. ${ranking.rank <= 3 ? "The upside is becoming the team everyone measures themselves against." : "There is room to make the teams above them uncomfortable."} The more often they force opponents to chase, the easier it gets to believe.`;
  const wrong = fortunate
    ? `The friendly matchups disappear before the scoring takes a step forward. Then the same kind of performance that was enough to get by starts ending in losses, and the standings catch up in a hurry. We would be watching the quality of the weeks, not just whether they sneak out another win.`
    : !strong
      ? `The rebound keeps being something we talk about instead of something that actually happens. Another quiet week would make it harder to stay patient, especially if the rest of the league starts pulling away. We do not need perfection, but we do need a reason to believe the next outing will be different.`
      : `A couple of ordinary weeks take the shine off, and suddenly this team looks much more beatable. ${roster <= 35 ? "That is the version that worries us: the scoring edge fades and there is not an obvious reason to expect an immediate recovery." : "One off week would not change our minds. A run of them would make us reconsider how much confidence this spot deserves."}`;
  return { whyHigh: high, whyLow: low, couldGoRight: right, couldGoWrong: wrong };
}
