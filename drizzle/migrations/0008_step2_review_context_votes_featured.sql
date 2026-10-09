ALTER TABLE public.reviews ADD COLUMN relationship text;
ALTER TABLE public.reviews ADD COLUMN worked_company text;
ALTER TABLE public.reviews ADD COLUMN worked_from date;
ALTER TABLE public.reviews ADD COLUMN worked_to date;
ALTER TABLE public.reviews ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN helpful_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.reviews ADD COLUMN unhelpful_count integer NOT NULL DEFAULT 0;
CREATE INDEX reviews_relationship_idx ON public.reviews (relationship);
CREATE INDEX reviews_featured_idx ON public.reviews (is_featured) WHERE is_featured;
CREATE INDEX reviews_created_idx ON public.reviews (created_at DESC);
CREATE INDEX reviews_reviewer_idx ON public.reviews (reviewer_id);

CREATE OR REPLACE FUNCTION public.validate_review_context()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _is_admin boolean := public.has_role(auth.uid(), 'admin');
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.helpful_count := 0; NEW.unhelpful_count := 0;
      IF NOT _is_admin THEN NEW.is_featured := false; END IF;
    ELSE
      NEW.helpful_count := OLD.helpful_count; NEW.unhelpful_count := OLD.unhelpful_count;
      IF NOT _is_admin THEN NEW.is_featured := OLD.is_featured; END IF;
    END IF;
  END IF;
  NEW.worked_company := nullif(left(btrim(coalesce(NEW.worked_company,'')), 100), '');
  IF NEW.relationship IS NOT NULL AND NEW.relationship NOT IN ('managed','reported_to','peer','client','vendor') THEN
    RAISE EXCEPTION 'Invalid relationship' USING ERRCODE = 'P0001';
  END IF;
  -- New reviews (and edits that start adding details) must be complete.
  IF TG_OP = 'INSERT' OR NEW.relationship IS NOT NULL OR NEW.worked_company IS NOT NULL OR NEW.worked_from IS NOT NULL THEN
    IF NEW.relationship IS NULL OR NEW.worked_company IS NULL OR NEW.worked_from IS NULL THEN
      RAISE EXCEPTION 'Please add your working relationship, company and dates.' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF NEW.worked_from IS NOT NULL AND NEW.worked_from > current_date THEN
    RAISE EXCEPTION 'Start date cannot be in the future.' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.worked_to IS NOT NULL AND (NEW.worked_from IS NULL OR NEW.worked_to < NEW.worked_from) THEN
    RAISE EXCEPTION 'End date cannot be before the start date.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reviews_validate_context BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.validate_review_context();

CREATE TABLE public.review_votes (
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote smallint NOT NULL CHECK (vote IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, user_id)
);
CREATE INDEX review_votes_user_idx ON public.review_votes (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_votes TO authenticated;
GRANT ALL ON public.review_votes TO service_role;
ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own votes read" ON public.review_votes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own votes insert" ON public.review_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own votes update" ON public.review_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own votes delete" ON public.review_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.validate_vote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = NEW.review_id AND (r.reviewer_id = NEW.user_id OR r.profile_id = NEW.user_id)) THEN
    RAISE EXCEPTION 'You cannot vote on your own reviews or reviews about you.' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM public.review_votes WHERE user_id = NEW.user_id AND created_at > now() - interval '1 hour') >= 60 THEN
    RAISE EXCEPTION 'You are voting too fast. Please try again later.' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'UPDATE' THEN NEW.review_id := OLD.review_id; NEW.user_id := OLD.user_id; NEW.created_at := now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER review_votes_validate BEFORE INSERT OR UPDATE ON public.review_votes FOR EACH ROW EXECUTE FUNCTION public.validate_vote();

CREATE OR REPLACE FUNCTION public.refresh_vote_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _rid uuid := COALESCE(NEW.review_id, OLD.review_id);
BEGIN
  UPDATE public.reviews SET
    helpful_count = (SELECT count(*) FROM public.review_votes WHERE review_id = _rid AND vote = 1),
    unhelpful_count = (SELECT count(*) FROM public.review_votes WHERE review_id = _rid AND vote = -1)
  WHERE id = _rid;
  RETURN NULL;
END $$;
CREATE TRIGGER review_votes_counts AFTER INSERT OR UPDATE OR DELETE ON public.review_votes FOR EACH ROW EXECUTE FUNCTION public.refresh_vote_counts();

CREATE OR REPLACE FUNCTION public.limit_reports()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.reports WHERE reporter_id = NEW.reporter_id AND created_at > now() - interval '24 hours') >= 10 THEN
    RAISE EXCEPTION 'Report limit reached. Please try again tomorrow.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reports_rate_limit BEFORE INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION public.limit_reports();