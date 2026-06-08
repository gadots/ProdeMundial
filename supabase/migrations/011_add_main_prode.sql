-- Add main_prode_id to profiles for copycat sync feature.
-- null = libre mode (each prode manages its own predictions independently).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS main_prode_id UUID REFERENCES prodes(id) ON DELETE SET NULL;
