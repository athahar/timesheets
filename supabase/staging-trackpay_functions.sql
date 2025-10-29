CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_display_name_from_email()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- If display_name is not provided, extract from email
    IF NEW.display_name IS NULL OR NEW.display_name = '' THEN
        NEW.display_name := SPLIT_PART(NEW.email, '@', 1);
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trackpay_sessions_person_hours_default()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.crew_size IS NULL OR NEW.crew_size < 1 THEN
    NEW.crew_size := 1;
  END IF;

  IF NEW.duration_minutes IS NOT NULL THEN
    NEW.person_hours := NEW.duration_minutes / 60.0 * NEW.crew_size;
  END IF;

  RETURN NEW;
END;
$function$
;

