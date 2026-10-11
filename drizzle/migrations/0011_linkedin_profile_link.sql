ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url text;
COMMENT ON COLUMN public.profiles.linkedin_url IS 'Public LinkedIn URL; maintained by trigger from profile_linkedin (null when hidden).';

CREATE TABLE public.profile_linkedin (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  url text NOT NULL CHECK (url ~ '^https://www\.linkedin\.com/in/[A-Za-z0-9\-_%]{3,100}/?$'),
  is_public boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_linkedin TO authenticated;
GRANT ALL ON public.profile_linkedin TO service_role;
ALTER TABLE public.profile_linkedin ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own linkedin" ON public.profile_linkedin FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Owner inserts own linkedin" ON public.profile_linkedin FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Owner updates own linkedin" ON public.profile_linkedin FOR UPDATE TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Owner deletes own linkedin" ON public.profile_linkedin FOR DELETE TO authenticated USING (auth.uid() = profile_id);

CREATE OR REPLACE FUNCTION public.sync_profile_linkedin() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET linkedin_url = NULL WHERE id = OLD.profile_id;
    RETURN OLD;
  END IF;
  UPDATE public.profiles SET linkedin_url = CASE WHEN NEW.is_public THEN NEW.url END WHERE id = NEW.profile_id;
  RETURN NEW;
END $$;
CREATE TRIGGER profile_linkedin_sync AFTER INSERT OR UPDATE OR DELETE ON public.profile_linkedin
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_linkedin();

CREATE OR REPLACE FUNCTION public.guard_profile_linkedin_url() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.linkedin_url IS DISTINCT FROM OLD.linkedin_url AND pg_trigger_depth() = 1 THEN
    NEW.linkedin_url := OLD.linkedin_url;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_guard_linkedin BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_linkedin_url();