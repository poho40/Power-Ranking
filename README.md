# Powerhouse Fantasy Power Rankings

A production-ready Next.js dashboard that turns ESPN Fantasy Football league data into deterministic, explainable power rankings. It includes standings, weekly matchups, team analytics, charts, all-play expected wins, matchup-luck analysis, and an idempotent Supabase snapshot design.

It also includes a permanent preseason roster-ranking system at `/preseason`. Before completed games exist, the homepage features preseason rankings; regular-season performance rankings take over after the first final matchup without removing the preseason baseline.

## Stack

- Next.js App Router, React, TypeScript (strict), Tailwind CSS
- Recharts for responsive charts
- Zod validation at the ESPN boundary
- Vitest for ranking and analytics unit tests
- Supabase PostgreSQL for immutable published rankings

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The default `DATA_SOURCE=mock` needs no account or credentials. It serves a deterministic ten-team, six-week league designed to demonstrate scoring differences, luck, form, movement, roster depth, and schedule strength.

Useful checks:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Live ESPN data

Set these server environment variables:

```env
DATA_SOURCE=espn
ESPN_LEAGUE_ID=123456
ESPN_SEASON=2026
ESPN_S2=
ESPN_SWID=
```

Public leagues need only the league ID and season. Private leagues also need the `espn_s2` and `SWID` cookie values from an authenticated ESPN browser session. Do not add quotes unless they are part of the value. These values are read only by modules marked `server-only`, never use a `NEXT_PUBLIC_` prefix, and are never returned or logged. ESPN's Fantasy API is unofficial; endpoint construction, validation, and raw parsing are isolated under `src/lib/espn`.

`DATA_SOURCE=espn` deliberately returns a useful error screen when configuration, authentication, upstream availability, or response validation fails. Switch back to `mock` at any time.

## Ranking methodology

Every component is normalized from 0–100 within the league, then combined as follows:

- 30% points-per-game scoring strength
- 20% last-three-week scoring form (50/30/20 recency weighting)
- 15% actual record
- 15% all-play expected wins
- 10% roster strength (80% starters, 20% bench)
- 10% opponent scoring strength

Expected wins compare each weekly score with every other league score; ties earn half-credit. Luck is actual wins plus half of ties minus expected wins. Equal power scores break by points per game, expected wins, record, then team name. All calculations are clamped, finite, and deterministic.

### Preseason methodology

Preseason rankings are independent from wins and weekly performance. The engine:

- optimizes each roster against its actual ESPN starter, FLEX, SUPERFLEX, kicker, and defense configuration;
- uses ESPN's full-season projected fantasy-point total, falling back only to zero when that total is absent or invalid;
- derives position-specific replacement levels from league size and optimized starter demand;
- values players by projected points above replacement;
- combines top-end starter value with diminishing useful-depth value;
- scores FLEX only from players assigned to FLEX-like slots in the unique optimized lineup;
- normalizes each applicable group to 0–100 for explanation, while Overall independently normalizes full usable VOR from unique optimized starters plus discounted useful bench VOR.

Kicker and defense groups disappear automatically in leagues that do not use them. Multiple FLEX, 2-QB, SUPERFLEX, and hybrid ESPN eligibility are supported.

## Immutable published ranking snapshots

ESPN is ranking input, not the public ranking store. A trusted publication job calculates rankings once, freezes the complete display model in Supabase, and public ranking pages read that snapshot until another is intentionally published. Current rosters, standings, scores, and upcoming matchups remain live ESPN data.

Create a Supabase project, open its SQL editor, and apply the migrations in numeric order from `supabase/migrations/` (including `003_immutable_published_snapshots.sql`). Configure the app and Vercel with:

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

The service-role key and cron secret are server-only. Public RLS policies permit reads of published rows; writes require the service role. Database triggers reject updates/deletes, the identity constraint is `(league_id, season, week, snapshot_type)`, and the publication RPC inserts parent/team/position/player rows in one transaction. A duplicate call returns the existing snapshot without changing it.

To freeze the current post-draft board as Week 0, start the app locally and run:

```bash
npm run dev
npm run publish:preseason
```

The command calls the protected local publication endpoint and refuses to overwrite an existing preseason snapshot. `vercel.json` schedules `/api/cron/publish-rankings` for 17:00 UTC every Tuesday (Tuesday morning Pacific). The endpoint independently verifies authorization, finds the latest fully completed fantasy week, skips incomplete or already-published weeks, calculates movement from the previous published snapshot, and creates one immutable regular-season release.

Inspect snapshots in the Supabase Table Editor (`ranking_snapshots`, `team_ranking_snapshots`, `preseason_position_snapshots`, and `preseason_player_snapshots`) or query by league, season, week, and type. For explicit local development without Supabase, use `DATA_SOURCE=mock` or set `SNAPSHOT_DEV_FALLBACK=true`. Production never silently falls back to live recalculation.

## Publishing weekly league news

Articles live in `content/news/` as Markdown with validated frontmatter. To publish a weekly report:

1. Copy `content/templates/weekly-power-report.md` into `content/news/`.
2. Give it a descriptive filename such as `2026-week-4.md`.
3. Fill in `title`, safe hyphenated `slug`, `season`, `week`, `publishedAt`, and `summary`.
4. Write and edit the Markdown article.
5. Keep `status: "draft"` while reviewing. Drafts never appear on the production news index, homepage, or public article routes.
6. Change the status to `published` when the article is ready.
7. Commit and push the article.
8. Vercel builds and publishes it automatically.

Published articles are sorted by season, week, then publication date. The latest published report automatically appears on the homepage. Article text is repository-backed and renders even if ESPN is temporarily unavailable.

The deterministic editorial candidate system in `src/lib/news/editorialBrief.ts` reads current power rankings, movement, scoring, expected wins, luck, recent form, records, and upcoming matchups. It returns factual candidates and reason codes for high-on, low-on, fraud-watch, buy-low, sell-high, riser, faller, and matchup storylines; it never writes or publishes prose. During local development, visit `/api/editorial-brief` to inspect the current structured brief. That endpoint returns 404 in production.

## Deployment

Deploy to Vercel as a standard Next.js app. Add the same environment variables in project settings, leave `DATA_SOURCE=mock` for the demo, or use `espn` for the live league. Never expose ESPN cookies or the Supabase service-role key to browser-visible variables. ESPN fetches use a ten-minute Next.js cache.

## Security notes

- ESPN cookies and Supabase service credentials live exclusively in server modules.
- League IDs and seasons are validated; clients cannot provide arbitrary ESPN URLs.
- Authentication values and full upstream payloads are not logged.
- `.env*` is ignored while `.env.example` contains placeholders only.
- React escapes league and team text by default.

This project is independent and is not affiliated with or endorsed by ESPN.
