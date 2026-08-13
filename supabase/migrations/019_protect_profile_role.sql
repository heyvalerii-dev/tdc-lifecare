-- Staff & Access: only the service role (admin API) or SQL console may
-- change profiles.role. Authenticated clients cannot self-promote via RLS.
-- Existing SELECT/UPDATE policies are otherwise unchanged.

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- Supabase SQL editor / migrations still need to seed the first admin.
    IF current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin') THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Profile role can only be changed by an administrator';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_role ON public.profiles;

CREATE TRIGGER profiles_protect_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();
