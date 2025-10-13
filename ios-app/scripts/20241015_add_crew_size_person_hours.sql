-- TrackPay crew size migration

-- Adds crew size and person-hours columns to trackpay_sessions
ALTER TABLE trackpay_sessions
  ADD COLUMN crew_size integer NOT NULL DEFAULT 1,
  ADD COLUMN person_hours numeric(10,2);

-- Backfill legacy sessions with person-hours derived from duration
UPDATE trackpay_sessions
SET person_hours = COALESCE(duration, 0) * crew_size
WHERE person_hours IS NULL;

-- Helper function keeps crew_size >= 1 and maintains person_hours
CREATE OR REPLACE FUNCTION trackpay_sessions_person_hours_default()
RETURNS trigger AS $$
BEGIN
  IF NEW.crew_size IS NULL OR NEW.crew_size < 1 THEN
    NEW.crew_size := 1;
  END IF;

  IF NEW.duration IS NOT NULL THEN
    NEW.person_hours := NEW.duration * NEW.crew_size;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trackpay_sessions_person_hours ON trackpay_sessions;

CREATE TRIGGER trg_trackpay_sessions_person_hours
BEFORE INSERT OR UPDATE ON trackpay_sessions
FOR EACH ROW
EXECUTE FUNCTION trackpay_sessions_person_hours_default();
