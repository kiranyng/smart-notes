/*
  # Add new fields to daily_plans table

  1. Changes
    - `daily_plans`
      - Add `todos` (text, default '')
      - Add `notes` (text, default '')
      - Add `breakfast` (text, default '')
      - Add `lunch` (text, default '')
      - Add `dinner` (text, default '')
      - Add `snacks` (text, default '')
      - Add `water_intake_glasses` (integer, default 0)
      - Add `schedule` (text, default '')
      - Add `mood` (text, default '')
      - Add `weather` (text, default '')
      - Add `high_level_note` (text, default '')
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_plans' AND column_name = 'todos') THEN
    ALTER TABLE daily_plans ADD COLUMN todos text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_plans' AND column_name = 'notes') THEN
    ALTER TABLE daily_plans ADD COLUMN notes text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_plans' AND column_name = 'breakfast') THEN
    ALTER TABLE daily_plans ADD COLUMN breakfast text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_plans' AND column_name = 'lunch') THEN
    ALTER TABLE daily_plans ADD COLUMN lunch text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_plans' AND column_name = 'dinner') THEN
    ALTER TABLE daily_plans ADD COLUMN dinner text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_plans' AND column_name = 'snacks') THEN
    ALTER TABLE daily_plans ADD COLUMN snacks text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_plans' AND column_name = 'water_intake_glasses') THEN
    ALTER TABLE daily_plans ADD COLUMN water_intake_glasses integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_plans' AND column_name = 'schedule') THEN
    ALTER TABLE daily_plans ADD COLUMN schedule text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_plans' AND column_name = 'mood') THEN
    ALTER TABLE daily_plans ADD COLUMN mood text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_plans' AND column_name = 'weather') THEN
    ALTER TABLE daily_plans ADD COLUMN weather text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_plans' AND column_name = 'high_level_note') THEN
    ALTER TABLE daily_plans ADD COLUMN high_level_note text DEFAULT '';
  END IF;
END $$;