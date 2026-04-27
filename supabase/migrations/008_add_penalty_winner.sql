-- Add penalty_winner to predictions table for knockout-phase draws
alter table public.predictions
  add column if not exists penalty_winner text
    check (penalty_winner in ('home', 'away'));
