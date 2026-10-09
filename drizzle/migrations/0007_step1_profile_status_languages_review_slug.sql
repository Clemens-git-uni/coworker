ALTER TABLE public.profiles ADD COLUMN status text NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN status_return_date date;
ALTER TABLE public.profiles ADD COLUMN status_note text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN review_slug text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '');
CREATE UNIQUE INDEX profiles_review_slug_idx ON public.profiles (review_slug);
CREATE INDEX profiles_status_idx ON public.profiles (status);

CREATE OR REPLACE FUNCTION public.protect_profile_stats()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    NEW.review_count := OLD.review_count;
    NEW.avg_rating := OLD.avg_rating;
    IF NEW.review_slug IS DISTINCT FROM OLD.review_slug THEN NEW.review_slug := OLD.review_slug; END IF;
  END IF;
  IF NEW.theme NOT IN ('light','dark','system') THEN NEW.theme := 'system'; END IF;
  IF NEW.status NOT IN ('active','on_leave','inactive') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  NEW.status_note := left(btrim(coalesce(NEW.status_note,'')), 140);
  IF NEW.status = 'active' THEN NEW.status_return_date := NULL; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.regenerate_review_slug()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _s text := replace(gen_random_uuid()::text, '-', '');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  UPDATE public.profiles SET review_slug = _s WHERE id = auth.uid();
  RETURN _s;
END $$;
REVOKE EXECUTE ON FUNCTION public.regenerate_review_slug() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regenerate_review_slug() TO authenticated;

CREATE TABLE public.profile_languages (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  language_code text NOT NULL CHECK (language_code ~ '^[a-z]{2,3}$'),
  proficiency text NOT NULL CHECK (proficiency IN ('basic','conversational','professional','native')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, language_code)
);
CREATE INDEX profile_languages_code_idx ON public.profile_languages (language_code, proficiency);
GRANT SELECT ON public.profile_languages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_languages TO authenticated;
GRANT ALL ON public.profile_languages TO service_role;
ALTER TABLE public.profile_languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Languages are public" ON public.profile_languages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners add languages" ON public.profile_languages FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Owners update languages" ON public.profile_languages FOR UPDATE TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Owners delete languages" ON public.profile_languages FOR DELETE TO authenticated USING (auth.uid() = profile_id);