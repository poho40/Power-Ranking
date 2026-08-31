# Supabase snapshot setup

1. Create a Supabase project.
2. In the SQL Editor, run every file in `migrations/` in numeric order.
3. Copy the project URL to `NEXT_PUBLIC_SUPABASE_URL` and the service-role key to `SUPABASE_SERVICE_ROLE_KEY` in Vercel. Never expose the service-role key with a `NEXT_PUBLIC_` prefix.
4. Generate a strong `CRON_SECRET` and add the same value to local `.env.local` and Vercel.
5. Start the local app and run `npm run publish:preseason` once. A second run returns the existing immutable Week 0 snapshot.
6. Deploy. `vercel.json` calls the protected publication route Tuesdays at 17:00 UTC. Vercel sends `CRON_SECRET` as a bearer token.

Inspect publication state in `ranking_snapshots`. Each complete parent must have one `team_ranking_snapshots` row per league team. Preseason releases additionally contain position and player detail rows. The `publish_ranking_snapshot` RPC is transactional, uniqueness-protected, restricted to `service_role`, and immutable-table triggers reject updates and deletes.
