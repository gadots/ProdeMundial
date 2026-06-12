-- Migration 015: Performance indexes
--
-- The schema (001) only created the implicit indexes that come with PRIMARY KEY
-- and UNIQUE constraints. The hot paths below do lookups on columns with no
-- index, forcing sequential scans that get slower as data grows:
--
--   • calculate_match_points()  → predictions WHERE match_id = ?
--   • getLeaderboard()          → scores WHERE prode_id = ?
--   • sync token decay / live   → matches WHERE status = ?
--   • RLS member checks         → prode_members WHERE prode_id = ?
--
-- All use IF NOT EXISTS so this migration is safe to re-run.

-- predictions.match_id — scanned for every point calculation
create index if not exists idx_predictions_match_id
  on public.predictions (match_id);

-- predictions (match_id, points_earned) — finding uncalculated predictions
create index if not exists idx_predictions_match_uncalc
  on public.predictions (match_id)
  where points_earned is null;

-- scores by prode — leaderboard aggregation
create index if not exists idx_scores_prode_id
  on public.scores (prode_id);

-- matches by status — live detection + token decay checks
create index if not exists idx_matches_status
  on public.matches (status);

-- prode_members by prode — RLS is_member_of_prode() checks
create index if not exists idx_prode_members_prode_id
  on public.prode_members (prode_id);

-- multiplier_tokens by prode — token status in leaderboard/stats
create index if not exists idx_multiplier_tokens_prode_id
  on public.multiplier_tokens (prode_id);
