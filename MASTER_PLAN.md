# ESPN Fantasy Power Rankings — MASTER_PLAN.md

## Project Goal

Build a polished web application for an ESPN Fantasy Football league that automatically:

- Fetches league data from ESPN.
- Calculates objective weekly power rankings.
- Tracks ranking movement over time.
- Displays standings, matchups, team analytics, and historical trends.
- Generates useful weekly league insights.
- Supports private ESPN leagues securely.
- Can be deployed publicly without exposing ESPN credentials.

The application should feel like a professional sports analytics website rather than a basic fantasy dashboard.

---

# Core Principles

1. Do not expose ESPN authentication credentials to the browser.
2. All ESPN requests for private leagues must happen server-side.
3. The ranking algorithm must be deterministic and explainable.
4. Every ranking component must be visible to users.
5. Historical rankings must be persisted once database support is added.
6. The application must work well on desktop and mobile.
7. Components should be reusable and modular.
8. Avoid unnecessary dependencies.
9. Validate every milestone before proceeding.
10. Do not stop after completing a task to ask for permission.

After completing a task:

- Run applicable tests.
- Run lint.
- Run type checking.
- Fix failures.
- Update this file.
- Mark the task complete.
- Proceed automatically to the next incomplete task.

Only stop if implementation is impossible without external information or credentials.

---

# Technology Stack

Use:

- Next.js
- TypeScript
- App Router
- React
- Tailwind CSS
- Recharts
- Zod for runtime validation

Initially:

- No database required.
- Fetch directly from ESPN through server-side API/service code.

Later:

- Supabase PostgreSQL for historical ranking snapshots.

Deployment target:

- Vercel

---

# Environment Variables

Create `.env.example`.

Expected variables:

```env
ESPN_LEAGUE_ID=
ESPN_SEASON=
ESPN_S2=
ESPN_SWID=
```

Never commit real credentials.

For private ESPN leagues:

- `ESPN_S2`
- `ESPN_SWID`

must only be accessed from server-side code.

Never prefix them with `NEXT_PUBLIC_`.

---

# Project Architecture

Target structure:

```text
src/
  app/
    page.tsx
    rankings/
      page.tsx
    standings/
      page.tsx
    matchups/
      page.tsx
    teams/
      [teamId]/
        page.tsx
    methodology/
      page.tsx
    api/
      league/
        route.ts
      rankings/
        route.ts

  components/
    layout/
    rankings/
    teams/
    standings/
    matchups/
    charts/
    ui/

  lib/
    espn/
      client.ts
      endpoints.ts
      parser.ts
      schemas.ts
      types.ts

    rankings/
      calculatePowerRankings.ts
      normalization.ts
      expectedWins.ts
      recentForm.ts
      scheduleStrength.ts
      rosterStrength.ts
      types.ts

    analytics/
      leagueAnalytics.ts
      teamAnalytics.ts

    utils/

  data/
    mockLeague.ts

  tests/
```

Exact structure may change when justified, but preserve separation between:

- ESPN integration
- normalized application data
- ranking logic
- UI

---

# Domain Models

Do not allow raw ESPN responses to leak throughout the application.

Convert ESPN data into internal models.

## League

```ts
interface League {
  id: string;
  name: string;
  season: number;
  currentWeek: number;
  teams: Team[];
  matchups: Matchup[];
}
```

## Team

```ts
interface Team {
  id: string;
  name: string;
  abbreviation?: string;
  logoUrl?: string;

  wins: number;
  losses: number;
  ties: number;

  pointsFor: number;
  pointsAgainst: number;

  roster: Player[];
}
```

## Player

```ts
interface Player {
  id: string;
  name: string;
  position: string;
  proTeam?: string;

  seasonProjectedPoints?: number;
  seasonActualPoints?: number;
  weeklyProjectedPoints?: number;
  weeklyActualPoints?: number;

  slot?: string;
}
```

## Matchup

```ts
interface Matchup {
  week: number;

  homeTeamId: string;
  awayTeamId: string;

  homeScore: number;
  awayScore: number;

  completed: boolean;
}
```

Additional fields may be added as needed.

---

# Power Ranking Philosophy

Power rankings should measure team quality rather than simply reproducing ESPN standings.

The ranking should reward:

- Winning.
- Scoring.
- Consistency.
- Recent performance.
- Performance relative to the rest of the league.
- Roster quality.
- Schedule difficulty.

The ranking must remain explainable.

---

# Initial Power Ranking Formula

Calculate six normalized scores.

Each component should produce a score between 0–100.

```text
Power Score =
  30% Scoring Strength
+ 20% Recent Form
+ 15% Record Strength
+ 15% Expected Wins
+ 10% Roster Strength
+ 10% Schedule Strength
```

Store individual component scores in the ranking result.

```ts
interface PowerRanking {
  teamId: string;

  rank: number;
  previousRank?: number;
  rankChange?: number;

  powerScore: number;

  components: {
    scoring: number;
    recentForm: number;
    record: number;
    expectedWins: number;
    roster: number;
    schedule: number;
  };
}
```

---

# Ranking Components

## 1. Scoring Strength — 30%

Primary measurement:

- Points per game.

Potential secondary measures:

- Scoring consistency.
- Median weekly score.
- Maximum weekly score.

Start with points per game.

Normalize across the league.

Best team ≈ 100.

Worst team ≈ 0.

---

## 2. Recent Form — 20%

Measure the team's most recent games.

Default window: last 3 completed weeks.

Weight more recent games slightly more heavily.

```text
Most recent week: 50%
Previous week:    30%
Third week:       20%
```

Base form primarily on scoring performance relative to the league.

Avoid using only wins because matchup luck should not dominate recent form.

---

## 3. Record Strength — 15%

Calculate winning percentage:

```text
wins + 0.5 * ties
------------------
total games
```

Normalize across the league.

---

## 4. Expected Wins — 15%

For every completed week, compare each team's score to every other team's score.

If a team scored more than 8 of the other 11 teams:

```text
Expected wins for that week = 8 / 11
```

Average this across all completed weeks.

This identifies teams that:

- score well but have unlucky schedules;
- have strong records despite weak scoring.

Expose:

```text
Actual Wins
Expected Wins
Luck Differential
```

Example:

```text
Actual Wins:   6
Expected Wins: 4.3
Luck: +1.7
```

Positive values imply favorable matchup luck.

Negative values imply unfavorable matchup luck.

---

## 5. Roster Strength — 10%

Initially calculate roster strength using available ESPN player information.

Potential inputs:

- projected fantasy points;
- recent fantasy points;
- starter production;
- positional strength.

Prioritize starters over bench players.

Suggested approach:

```text
80% starter strength
20% bench strength
```

If reliable projections are unavailable, use recent production instead.

The ranking system must gracefully degrade if ESPN does not supply sufficient player projection data.

---

## 6. Schedule Strength — 10%

Measure the difficulty of opponents a team has faced.

Use opponent power/scoring strength.

Avoid circular dependency when possible.

Initial implementation can use opponent average points per game instead of opponent power ranking.

Later extend to:

- past strength of schedule;
- remaining strength of schedule.

---

# Normalization

Implement reusable normalization utilities.

Support:

```ts
normalizeMinMax()
normalizeZScore()
```

Use min/max normalization initially.

Handle identical values safely.

If `max === min`, return a neutral value such as `50`.

Never produce NaN.

Clamp results:

```text
0 <= score <= 100
```

---

# Ranking Tie Breakers

If two teams have the same power score:

1. Higher points per game.
2. Higher expected wins.
3. Better actual record.
4. Team name alphabetical as deterministic final fallback.

---

# Ranking Explanations

Generate deterministic human-readable explanations.

Do not use AI initially.

Examples:

- League-leading scoring pushes this team into the top spot despite a 3–2 record.
- Three strong scoring weeks have driven a major rise in the rankings.
- A strong record masks below-average scoring and favorable matchup luck.
- The league's unluckiest team has performed much better than its record suggests.

Generate explanations from ranking metrics.

---

# Weekly Insights

Calculate:

## Team of the Week

Highest score for completed week.

## Lowest Score

Lowest score.

## Biggest Blowout

Largest matchup margin.

## Closest Matchup

Smallest matchup margin.

## Biggest Ranking Riser

Largest positive rank change.

## Biggest Ranking Faller

Largest negative rank change.

## Luckiest Team

Largest:

```text
actual wins - expected wins
```

## Unluckiest Team

Most negative:

```text
actual wins - expected wins
```

## Most Consistent Team

Lowest standard deviation in weekly scoring.

## Most Volatile Team

Highest standard deviation in weekly scoring.

---

# UI Design Direction

Use a modern sports analytics aesthetic.

Avoid copying ESPN branding directly.

Desired characteristics:

- Dark-oriented sports dashboard.
- Strong typography.
- Large ranking numbers.
- Cards with subtle borders.
- Clear statistical hierarchy.
- Compact tables.
- Responsive mobile design.
- Smooth but restrained transitions.

Do not overuse gradients.

---

# Main Navigation

Desktop navigation:

```text
Power Rankings
Standings
Matchups
Teams
Methodology
```

Mobile navigation should collapse appropriately.

---

# Homepage

Route: `/`

Homepage should function as the league dashboard.

Include:

## Header

League name.

Current week.

Season.

## Top 3 Power Rankings

Prominent cards.

## Full Power Ranking Preview

Compact list.

## Weekly Results

Latest completed week.

## League Insights

Cards for:

- Team of the Week.
- Biggest Blowout.
- Closest Game.
- Luckiest Team.
- Unluckiest Team.

## Ranking Movers

Show largest rises/falls.

---

# Rankings Page

Route: `/rankings`

Primary application page.

Display:

```text
Rank
Team
Power Score
Record
Points/Game
Expected Wins
Rank Change
```

Each team should have an expandable or clickable breakdown.

Example:

```text
#1 Fourth & Long

Power Score    94.3
Record         4–1
PPG            132.6
Expected Wins  4.7

Scoring        98
Recent Form    96
Record         84
Expected Wins  97
Roster         88
Schedule       82
```

Include horizontal visual bars for component scores.

---

# Ranking Movement

Show:

```text
▲ 3
▼ 2
—
```

Color may reinforce direction, but movement must not rely solely on color.

Use accessible text labels.

---

# Standings Page

Route: `/standings`

Show actual league standings.

Columns:

```text
Team
Record
Win %
Points For
Points Against
Point Differential
Expected Wins
Luck
Power Rank
```

Allow sorting.

---

# Matchups Page

Route: `/matchups`

Provide week selector.

Display matchup cards.

Each card:

```text
Team A     124.5
Team B     118.2

Margin: 6.3
```

Optional future enhancement:

Show what percentage of league teams each score would have beaten.

---

# Team Page

Route: `/teams/[teamId]`

Include:

## Team Header

- Team name.
- Logo.
- Record.
- Current power rank.
- Power score.

## Ranking Breakdown

Six power score components.

## Season Statistics

- Points per game.
- Points against.
- Expected wins.
- Luck.
- Scoring standard deviation.
- Highest week.
- Lowest week.

## Ranking History

Line chart.

## Weekly Scores

Chart showing score by week.

## Matchup History

Table.

## Current Roster

Grouped by configured ESPN roster slots rather than assuming fixed league positions.

---

# Methodology Page

Route: `/methodology`

Clearly explain how rankings work.

Show:

```text
30% Scoring
20% Recent Form
15% Record
15% Expected Wins
10% Roster Strength
10% Schedule Strength
```

Explain each metric.

Explain expected wins.

Explain luck.

Explain normalization.

This page is important because league members should be able to understand why teams are ranked where they are.

---

# ESPN Integration

Create an ESPN service layer.

Do not make ESPN requests directly from React components.

Use `src/lib/espn/`.

Responsibilities:

## client.ts

- Perform HTTP requests.
- Add authentication cookies.
- Handle request failures.

## schemas.ts

- Validate ESPN responses.
- Use Zod where practical.

## parser.ts

Convert ESPN structures into internal app domain models.

## types.ts

Raw ESPN-related TypeScript types.

---

# ESPN Request Handling

Support public and private leagues.

## Public League

Requires:

- league ID
- season

## Private League

Requires:

- league ID
- season
- `ESPN_S2`
- `ESPN_SWID`

Pass cookies server-side.

Never send those values to client components.

Because ESPN Fantasy APIs are unofficial and can change, isolate endpoint construction and parsing so changes can be fixed without rewriting the ranking engine or UI.

---

# ESPN Failure Handling

Handle:

- invalid league ID;
- authentication failure;
- ESPN unavailable;
- unexpected response shape;
- missing roster data;
- incomplete weeks;
- preseason state;
- league with no completed matchups.

Display meaningful errors.

Never crash the entire page because one optional field is missing.

---

# Mock Data

Before ESPN integration is complete, create realistic mock league data.

Minimum:

```text
10 teams
6 completed weeks
realistic fantasy scores
rosters
standings
```

The full app should be developable using mock data.

Allow a development configuration to switch between:

```text
mock
live ESPN
```

---

# Loading States

Every data-heavy route should have:

- loading state;
- empty state;
- error state.

Use skeleton loaders where appropriate.

Avoid layout shifts.

---

# Responsive Design

Support:

- mobile
- tablet
- desktop

Tables may become cards or horizontally scroll on smaller screens.

Main rankings page must remain easy to read on phones.

---

# Accessibility

Implement:

- semantic HTML;
- keyboard navigation;
- sufficient contrast;
- visible focus states;
- accessible chart labels;
- descriptive button labels.

Do not communicate ranking movement solely through color.

---

# Testing Strategy

Use unit tests for ranking calculations.

Ranking logic is the most important tested area.

Minimum tests:

## Normalization

- normal input;
- equal values;
- negative values;
- zero values;
- extremes.

## Expected Wins

- highest scoring team;
- lowest scoring team;
- ties;
- incomplete weeks.

## Recent Form

- fewer than 3 weeks;
- exactly 3 weeks;
- more than 3 weeks.

## Power Ranking

- deterministic order;
- correct weighting;
- tie breaker behavior;
- missing optional data;
- no NaN values.

## League Analytics

- biggest blowout;
- closest matchup;
- highest scorer;
- luckiest team;
- unluckiest team.

---

# Data Persistence Phase

After the live application is functioning, add Supabase.

Create tables approximately like:

```text
leagues
teams
ranking_snapshots
team_ranking_snapshots
```

Example:

```sql
ranking_snapshots

id
league_id
season
week
created_at
```

```sql
team_ranking_snapshots

snapshot_id
team_id
rank
power_score
scoring_score
recent_form_score
record_score
expected_wins_score
roster_score
schedule_score
```

Avoid unnecessary duplication of ESPN data initially.

---

# Ranking Snapshot Behavior

When a week completes, persist a ranking snapshot.

Do not overwrite previous weeks.

Use a uniqueness rule for:

```text
league
season
week
```

Historical data enables:

- ranking movement;
- ranking charts;
- season history.

Snapshot writes must be idempotent so repeated refreshes do not create duplicate historical records.

---

# Future Scheduled Updates

Design code so rankings could eventually refresh automatically.

Potential mechanisms:

- Vercel Cron.
- Scheduled server job.

Do not implement until core product works unless trivial.

---

# Security

Never expose:

```text
ESPN_S2
ESPN_SWID
```

Avoid logging authentication values.

Do not include full ESPN response payloads in production logs.

Validate route inputs.

Escape user-facing team names normally through React.

Do not allow arbitrary ESPN URLs from client input.

---

# Performance

Use server rendering where appropriate.

Cache ESPN data for a reasonable interval.

Suggested initial cache:

```text
5–15 minutes
```

Do not call ESPN separately from every component.

Fetch league data once and derive analytics locally.

---

# Phase 1 — Project Foundation

## Task 1 — Initialize Application

Create Next.js TypeScript project.

Configure:

- Tailwind.
- ESLint.
- TypeScript strict mode.
- Test framework suitable for TypeScript unit tests.

Create base directory structure.

Validate build.

---

## Task 2 — Base Layout

Implement:

- global layout;
- navigation;
- responsive page container;
- mobile navigation;
- footer.

Add placeholder pages:

- `/`
- `/rankings`
- `/standings`
- `/matchups`
- `/methodology`

Validate routing.

---

## Task 3 — UI Foundation

Create reusable components:

- Card.
- StatCard.
- Badge.
- RankingBadge.
- ScoreBar.
- Table.
- EmptyState.
- ErrorState.
- LoadingSkeleton.

Avoid prematurely creating a massive custom component library.

---

# Phase 2 — Domain Layer

## Task 4 — Domain Types

Implement:

- League.
- Team.
- Player.
- Matchup.
- WeeklyTeamScore.
- PowerRanking.

Add helper types where necessary.

---

## Task 5 — Mock League

Create realistic mock league.

Use deterministic values.

Include enough variation for meaningful ranking results.

---

# Phase 2.5 — Preseason Power Rankings

Preseason rankings are a permanent roster-quality baseline and remain independent from regular-season performance rankings. They never use wins, weekly results, expected wins, recent form, or schedule strength.

## Task P1 — Preseason Types and ESPN Player Metadata

- [x] Add explicit preseason ranking, position-group, contribution, lineup, replacement-level, weight, and award types.
- [x] Parse ESPN eligible slots, NFL team, starter state, and explicit season/weekly actual/projected totals into internal player models without leaking raw ESPN objects.

## Task P2 — Player Valuation and Replacement Level

- [x] Implement safe preseason player valuation using only ESPN's full-season projected total, with a zero-value fallback for missing or invalid totals.
- [x] Calculate value over replacement dynamically from league size, required starters, and actual FLEX/SUPERFLEX demand.

## Task P3 — Projected Lineup Optimizer

- [x] Implement deterministic best-lineup optimization for standard, multiple-FLEX, 2-QB, SUPERFLEX, hybrid eligibility, kicker, and defense slots.
- [x] Enforce player uniqueness so one player can fill only one lineup slot.

## Task P4 — Position Groups, FLEX, and Bench

- [x] Score QB, RB, WR, TE, FLEX, bench, K, and D/ST only when applicable to league configuration.
- [x] Normalize group, starter, and depth strength to 0–100 and assign deterministic positional ranks.
- [x] Score FLEX from optimized FLEX assignments without reusing required-position starters.
- [x] Apply diminishing returns to useful positive-value reserves rather than rewarding roster quantity.

## Task P5 — Dynamic Overall Weights and Rankings

- [x] Generate league-aware weights that adapt to starter counts, multiple FLEX, SUPERFLEX, and omitted K/D/ST slots.
- [x] Guarantee effective weights total 100% and combine normalized strength scores rather than ordinal ranks.
- [x] Apply deterministic group and overall tie breakers and generate metric-derived explanations.

## Task P6 — Preseason Awards and History Architecture

- [x] Generate deterministic overall, positional, FLEX, bench-depth, and thin-roster awards.
- [x] Add an immutable, unique `(league_id, season)` Supabase preseason snapshot schema and server-only persistence service for future preseason-to-current comparisons.

## Task P7 — Preseason Product Experience

- [x] Add `/preseason` as a major responsive navigation destination with the overall board, applicable positional rankings, player contributions, starter/depth metrics, awards, and methodology access.
- [x] Make preseason rankings the primary homepage experience until a matchup is completed, then retain a prominent preseason link.
- [x] Add preseason rank, score, positional profile, explanation, and optimized starting lineup to every team page.
- [x] Extend methodology with projection, replacement, optimizer, FLEX, depth, normalization, and live effective-weight explanations.

## Task P8 — Preseason Validation

- [x] Add tests for player VOR, missing/identical projections, standard/FLEX/multi-FLEX/SUPERFLEX lineups, multiple eligibility, uniqueness, dynamic replacement, adaptive weights, missing K/D/ST, diminishing bench returns, tie breakers, determinism, finite scores, and awards.
- [x] Validate all teams and every applicable group against the configured live ESPN league.
- [x] Verify responsive overflow handling, loading/error/empty states, cache behavior, and server-only ESPN credentials.

---

# Phase 3 — Ranking Engine

## Task 6 — Weekly Score Utilities

Create utilities that return:

- team score per week;
- completed weeks;
- league scoring averages.

Add tests.

---

## Task 7 — Normalization Engine

Implement normalization.

Add comprehensive tests.

---

## Task 8 — Expected Wins

Implement expected-win calculation.

Return:

```text
Expected Wins
Expected Win %
Luck Differential
```

Handle tied weekly scores fairly, such as half-credit for tied all-play comparisons.

Add tests.

---

## Task 9 — Scoring Strength

Implement scoring component.

Add tests.

---

## Task 10 — Recent Form

Implement last-three-week weighted recent form.

Add tests.

---

## Task 11 — Record Strength

Implement record score.

Add tests.

---

## Task 12 — Schedule Strength

Implement opponent-strength score.

Add tests.

---

## Task 13 — Roster Strength

Implement roster score using available player data.

Gracefully fall back when projections are unavailable.

Add tests.

---

## Task 14 — Complete Power Ranking Engine

Combine components using:

```text
30 scoring
20 recent form
15 record
15 expected wins
10 roster
10 schedule
```

Sort teams.

Apply deterministic tie breakers.

Add tests.

---

## Task 15 — Ranking Explanation Engine

Generate short deterministic explanations.

Examples should reflect actual metrics.

Do not use random text.

---

# Phase 4 — League Analytics

## Task 16 — Weekly Analytics

Calculate:

- highest score;
- lowest score;
- biggest blowout;
- closest matchup.

Add tests.

---

## Task 17 — Season Analytics

Calculate:

- scoring average;
- scoring consistency;
- luckiest team;
- unluckiest team;
- strongest offense;
- most volatile team.

Add tests.

---

# Phase 5 — Core UI

## Task 18 — Rankings Page

Build complete ranking experience using mock data.

Include:

- ranking;
- team;
- movement;
- record;
- PPG;
- expected wins;
- power score.

Support responsive layouts.

---

## Task 19 — Ranking Detail

Add ranking component breakdown.

Display six metrics.

Show generated ranking explanation.

---

## Task 20 — Homepage

Build dashboard.

Include:

- top rankings;
- latest week results;
- league insights;
- movers.

---

## Task 21 — Standings Page

Build sortable standings table.

---

## Task 22 — Matchups Page

Add:

- week selector;
- matchup cards;
- scores;
- margins.

---

## Task 23 — Team Page

Build dynamic team page.

Include:

- summary;
- ranking breakdown;
- season stats;
- weekly scores;
- roster;
- matchup history.

---

## Task 24 — Charts

Add Recharts.

Create:

- weekly scoring chart;
- ranking history chart shell;
- ranking component visualization.

Ensure responsive behavior.

---

## Task 25 — Methodology Page

Explain algorithm clearly.

Include weights and expected-win methodology.

---

# Phase 5.5 — News / Weekly Editorial

Editorial content is a separate repository-backed publishing system. It may cite objective analytics but can never modify ranking inputs or calculations.

## Task N1 — Content Architecture and Metadata

- [x] Add isolated Markdown article types, strict Zod frontmatter validation, and repository-backed loading from `content/news/`.
- [x] Support title, slug, season, week, published date, summary, draft/published status, hero label, author, featured teams, and tags.
- [x] Validate safe hyphenated slugs and prevent arbitrary filesystem resolution.

## Task N2 — Publishing Workflow

- [x] Filter public content to published articles and allow draft article preview only outside production.
- [x] Sort by season descending, week descending, publication date descending, then slug.
- [x] Add a realistic draft Week 1 report and reusable weekly report template without auto-publishing commentary.

## Task N3 — Editorial Analytics Brief

- [x] Generate deterministic high-on, low-on, fraud-watch, buy-low, sell-high, biggest-riser, biggest-faller, and matchup candidates from existing analytics.
- [x] Include factual team context and centralized reason codes without generating or publishing editorial prose.
- [x] Add a development-only, no-store `/api/editorial-brief` route that returns 404 in production.

## Task N4 — News Product Experience

- [x] Add `/news` with a sports-desk index, published article cards, dates, summaries, tags, and empty state.
- [x] Add statically generated `/news/[slug]` pages with metadata, canonical paths, Open Graph article fields, draft protection, and readable Markdown typography.
- [x] Add News to desktop/mobile navigation and show the latest published report on the homepage.
- [x] Ensure previously published text does not require ESPN availability to render.

## Task N5 — Testing and Documentation

- [x] Test metadata parsing, draft/published filtering, sorting, slug lookup and rejection, every editorial heuristic, movement, deterministic output, and finite numeric context.
- [x] Document the manual draft-review-publish-deploy workflow and editorial-brief data source in README.
- [x] Validate production draft 404 behavior, published-content behavior through fixtures, responsive article styling, client-secret isolation, lint, types, tests, and production build.

---

# Phase 6 — ESPN Integration

## Task 26 — ESPN Client

Build server-side ESPN HTTP client.

Support public league configuration first.

Add proper error handling.

Keep endpoint construction isolated because the ESPN Fantasy API is unofficial.

---

## Task 27 — Private League Authentication

Support:

```text
ESPN_S2
ESPN_SWID
```

through server environment variables.

Verify they cannot appear in client bundles.

Never log these values.

---

## Task 28 — ESPN Response Validation

Add response validation.

Do not assume every ESPN field exists.

Prefer validating only fields the application depends on so harmless upstream additions do not break parsing.

---

## Task 29 — ESPN Parser

Convert ESPN responses into internal domain types.

No raw ESPN objects should reach UI components.

---

## Task 30 — Replace Mock Data

Wire application to ESPN service.

Retain mock mode for development/testing.

---

## Task 31 — ESPN Error UI

Handle:

- invalid league;
- authentication issues;
- unavailable ESPN service;
- malformed data.

Provide useful messages.

---

# Phase 7 — Polish

## Task 32 — Loading Experience

Add skeleton states.

Avoid flashing empty pages.

---

## Task 33 — Transitions

Add subtle transitions for:

- ranking movement;
- expanding team details;
- navigation;
- chart loading.

Respect reduced-motion preferences.

Do not sacrifice usability for animation.

---

## Task 34 — Mobile Pass

Test every route on narrow screen sizes.

Fix:

- overflowing tables;
- cramped charts;
- navigation;
- ranking cards.

---

## Task 35 — Accessibility Pass

Audit keyboard navigation and semantics.

Fix accessibility issues.

---

## Task 36 — Performance Pass

Ensure ESPN data is not fetched unnecessarily.

Add caching.

Check bundle size.

---

# Phase 8 — Historical Rankings

## Task 37 — Supabase Setup

Add database configuration.

Create migration files.

Do not hardcode credentials.

---

## Task 38 — Ranking Snapshots

Persist weekly power ranking results.

Enforce unique league/season/week snapshots.

Ensure snapshot creation is idempotent.

---

## Task 39 — Ranking Movement

Compare current rank to previous snapshot.

Calculate:

```text
rankChange
```

---

## Task 40 — Ranking History

Display team ranking over time.

Chart:

```text
Week → Ranking
```

Invert vertical axis so rank 1 appears at the top.

---

# Phase 9 — Advanced Analytics

## Task 41 — All-Play Record

Calculate hypothetical record if every team played every other team each week.

Display:

```text
Actual Record
All-Play Record
```

---

## Task 42 — Schedule Luck

Quantify how favorable or unfavorable a team's schedule has been.

---

## Task 43 — Playoff Probability Architecture

Prepare code structure for future playoff simulation.

Do not implement full simulation unless prior tasks are stable.

---

## Task 44 — Remaining Schedule Strength

Calculate future opponent difficulty.

---

# Phase 10 — Final Production Validation

## Task 45 — Production Build

Run the project's equivalent commands for:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

If a required script does not yet exist, add an appropriate script rather than silently skipping validation.

Fix every failure.

---

## Task 46 — Security Review

Verify:

- ESPN cookies server-only;
- no secrets committed;
- no secrets in browser bundles;
- no sensitive logs;
- environment example contains placeholders only.

---

## Task 47 — UX Review

Check:

- loading;
- errors;
- empty states;
- responsiveness;
- navigation;
- ranking explanations;
- chart readability.

---

## Task 48 — README

Create complete README.

Include:

- project purpose;
- stack;
- installation;
- environment variables;
- public/private ESPN setup;
- running locally;
- mock mode;
- tests;
- deployment;
- ranking methodology.

Do not place real authentication values in examples.

---

# Future Enhancements

Do not implement these until all required tasks are complete.

Potential future features:

- playoff odds simulation;
- championship probability;
- trade analysis;
- waiver-wire insights;
- manager efficiency;
- optimal-lineup comparison;
- draft grades;
- weekly awards;
- historical seasons;
- head-to-head team comparison;
- commissioner-written ranking commentary;
- automated weekly recap generation;
- shareable ranking graphics;
- Discord integration;
- Slack integration;
- league records;
- rivalry tracking;
- trophies and awards;
- custom ranking weights.

---

# Optional Commissioner Mode

Future feature.

Allow commissioner/admin to adjust ranking weights:

```text
Scoring          30
Recent Form      20
Record           15
Expected Wins    15
Roster           10
Schedule         10
```

Weights must total 100%.

Allow resetting to default.

Do not allow arbitrary ranking manipulation without clearly labeling manual overrides.

---

# Definition of Done

The project is considered complete when:

1. ESPN league data loads successfully.
2. Private credentials remain server-side.
3. Every league team receives a power ranking.
4. Rankings are deterministic.
5. Ranking components are visible.
6. Expected wins work correctly.
7. League standings work.
8. Matchups work.
9. Team pages work.
10. Weekly analytics work.
11. Historical rankings work.
12. Ranking movement works.
13. Mobile layout works.
14. Error/loading states exist.
15. Ranking engine is thoroughly tested.
16. Lint passes.
17. Type checking passes.
18. Tests pass.
19. Production build succeeds.
20. README contains complete setup instructions.

---

# Codex Execution Rules

Codex must work through tasks sequentially.

For each task:

1. Inspect the current repository.
2. Read this file.
3. Find the first incomplete task.
4. Implement it fully.
5. Add or update tests.
6. Run relevant tests.
7. Run TypeScript checks where applicable.
8. Run lint where applicable.
9. Fix discovered issues.
10. Update documentation if behavior changed.
11. Mark the task complete in this file.
12. Continue automatically to the next task.

Do not stop merely because one task has finished.

Do not request approval between tasks.

Do not skip failing tests.

Do not mark a task complete if validation fails.

Do not rewrite working systems unnecessarily.

Prefer incremental implementation.

If an implementation detail is unspecified:

- choose the simplest maintainable solution;
- document the decision;
- continue.

Only stop when:

- every task is complete; or
- progress requires information that cannot reasonably be inferred or mocked.

When external credentials are required, implement everything possible using mock data first and clearly document the remaining external setup.

---

# Codex Kickoff Prompt

After saving this file as `MASTER_PLAN.md`, give Codex the following prompt:

```text
Read MASTER_PLAN.md completely before making changes.

You are responsible for implementing this project end-to-end.

Inspect the existing repository and determine the current state. Starting with the first incomplete task in MASTER_PLAN.md, implement each task sequentially.

After every task:
- add or update appropriate tests;
- run relevant tests;
- run lint and type checking when applicable;
- fix all failures;
- update MASTER_PLAN.md to mark the task complete;
- immediately continue to the next incomplete task.

Do not ask me for approval between tasks.
Do not stop after completing a milestone.
Do not skip validation.
Do not mark tasks complete when tests or builds are failing.
Do not replace working code unnecessarily.

For anything requiring ESPN credentials or external services that are not yet configured, create a clean mock/development implementation and complete everything else that can be implemented without the credentials.

Keep ESPN authentication strictly server-side. Never expose ESPN_S2 or ESPN_SWID to client code.

Use the architecture and ranking methodology described in MASTER_PLAN.md unless the existing repository provides a clearly better implementation. If you make a reasonable architectural deviation, document why.

Continue autonomously until:
1. every achievable task in MASTER_PLAN.md is complete;
2. lint passes;
3. type checking passes;
4. tests pass;
5. the production build succeeds.

Begin now.
```

---

# Implementation Status (2026-08-30)

All 48 implementation tasks are complete in the repository.

- [x] Tasks 1–3 — Next.js 16, strict TypeScript, Tailwind, ESLint, Vitest, responsive layout, navigation, and reusable UI primitives.
- [x] Tasks 4–15 — Domain models, deterministic mock league, weekly utilities, normalization, expected wins, all six ranking components, weighted ranking engine, tie breakers, and metric-derived explanations.
- [x] Tasks 16–17 — Weekly and season analytics, including scoring extremes, matchup margins, luck, and consistency.
- [x] Tasks 18–25 — Rankings, breakdowns, dashboard, sortable standings, week browser, dynamic team profiles, Recharts charts, and methodology.
- [x] Tasks 26–31 — Isolated server-only ESPN client, private cookies, Zod boundary validation, parser, mock/live switch, caching, API routes, and failure UI.
- [x] Tasks 32–36 — Loading/error/empty states, restrained transitions, responsive tables/cards/navigation/charts, semantic/accessibility treatment, and fetch caching.
- [x] Tasks 37–40 — Supabase migration, server-only snapshot repository, uniqueness constraints, idempotent upserts, prior-rank movement, and inverted ranking-history charts.
- [x] Tasks 41–44 — All-play records, schedule-luck calculation, playoff-projection input architecture, and remaining-schedule-strength calculation.
- [x] Tasks 45–48 — Production validation, security review, UX review, and complete README.

Credential-dependent verification remains an operator setup step rather than an implementation gap: live private ESPN parsing requires a real league and cookies, and remote snapshot writes require a Supabase project with the included migration applied. Mock mode exercises the complete product without either service.

Validated commands:

```text
npm run lint       PASS
npm run typecheck  PASS
npm test           PASS (8 tests)
npm run build      PASS
npm audit          PASS (0 vulnerabilities after Next.js 16 upgrade)
```

## Live ESPN Validation (2026-08-30)

- [x] Private ESPN authentication succeeded through the server-only service layer (HTTP 200).
- [x] Parsed the configured league as **Fantastic Folk**, season 2026, current matchup period 1.
- [x] Parsed all 10 teams, 70 scheduled matchups, team records, and 16-player rosters without duplicates or missing teams.
- [x] Confirmed the league-configured slots: QB 1, RB 2, WR 2, TE 1, FLEX 1, D/ST 1, K 1, bench 7, and IR 1. Active roster entries map to the configured starter and bench slots.
- [x] Updated ESPN stat parsing to expose separate season/weekly actual/projected fields selected by season, scoring period, stat source, and split type. Preseason value uses the full-season `appliedTotal`; ESPN `ratings.totalRating`, weekly projections, and season averages are not preseason inputs.
- [x] Matchups are complete only when ESPN returns `HOME`, `AWAY`, or `TIE`; `UNDECIDED` current and future matchups remain incomplete.
- [x] Generated 10 unique real-league preseason rankings with sequential ranks, finite normalized components, no NaN/Infinity values, no missing teams, and a 21.7–50.4 full-season roster-score range.
- [x] Verified HTTP 200 rendering with live data for `/`, `/rankings`, `/standings`, `/matchups`, `/teams`, and `/teams/1`.
- [x] Verified the ESPN cookie values do not occur in generated client assets and `.env.local` is explicitly ignored.
- [x] Added live-response regression tests for response validation, projections, configured slots, and matchup completion.

The configured league is currently preseason: ESPN reports 0–0 records, zero scores, and all 70 schedule entries as `UNDECIDED`. Consequently there are no real historical weekly scores or expected wins to compare yet. Scoring, form, record, expected-wins, and schedule components correctly remain neutral at 50; roster projections determine the preseason order. Historical calculations remain covered by deterministic unit tests and will activate automatically when ESPN marks the first matchup final.

Final live-mode validation:

```text
npm test           PASS (11 tests)
npm run lint       PASS
npm run typecheck  PASS
npm run build      PASS (live ESPN mode, 10-minute revalidation)
```

## Preseason Feature Validation (2026-08-30)

- Live ESPN roster: 10 teams, 160 players, 160 full-season projections, and 160 current-week projections parsed successfully as separate fields.
- Applicable live groups: QB, RB, WR, TE, FLEX, Bench, K, and D/ST; every group contains 10 unique teams.
- Live effective weights: QB 15%, RB 25%, WR 25%, TE 12%, FLEX 13%, Bench 5%, K 2%, D/ST 3%; total 100%.
- Every optimized lineup contains unique players and respects the configured 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX, 1 K, and 1 D/ST starters.
- All overall, group, starter, depth, full-season player-value, and replacement-level numbers are finite. Live full-season samples were verified at QB, RB, WR, and TE; changing weekly projections is regression-tested not to alter preseason rankings.
- `/`, `/preseason`, `/methodology`, and `/teams/1` render HTTP 200 with live preseason data.
- Desktop tables use contained horizontal scrolling; position sections collapse to a two-column mobile card layout.
- Full-season projection correction validation: 41 tests pass; lint, strict type checking, and the live-data production build pass. Live rankings contain 10 unique teams with sequential ranks, legal unique-player lineups, finite values, and a 21.7–50.4 score range.

## News Feature Validation (2026-08-30)

- Repository-backed Markdown loader validates strict frontmatter and safe slugs without requiring ESPN or a database.
- Public content includes only `published` articles; the included Week 1 report remains a manual-review draft.
- Production checks: `/news` returns 200, the draft article route returns 404, and `/api/editorial-brief` returns 404.
- Published article ordering and lookup are verified with deterministic test fixtures.
- Editorial candidates use power ranking, movement, scoring, expected wins, luck, recent form, record, and scheduled matchup data; no team names are hardcoded.
- The homepage reads only the latest published article and hides the section when none exists.
- The production build succeeds with ESPN configuration deliberately unavailable, so static news content remains deployable during an ESPN outage.
- Final validation: 38 tests pass; lint, strict type checking, and the production build pass.
