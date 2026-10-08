-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Guidelines acceptance
ALTER TABLE public.profiles ADD COLUMN guidelines_accepted_at timestamptz;

-- Review moderation status
ALTER TABLE public.reviews ADD COLUMN status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden'));

DROP POLICY "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Visible reviews are public" ON public.reviews FOR SELECT TO anon, authenticated
  USING (status = 'visible' OR auth.uid() = reviewer_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update reviews" ON public.reviews FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete reviews" ON public.reviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Validation: verified email, guidelines, daily limit, keyword filter, status guard
CREATE OR REPLACE FUNCTION public.review_contains_abuse(_text text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(coalesce(_text,'')) ~ '(\m(fuck\w*|shit\w*|bitch\w*|cunt\w*|asshole\w*|bastard\w*|dickhead\w*|retard\w*|whore\w*|slut\w*|faggot\w*|nigger\w*|idiot\w*|moron\w*|kill yourself|kys)\M)'
$$;

CREATE OR REPLACE FUNCTION public.validate_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_admin boolean := public.has_role(auth.uid(), 'admin');
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.reviewer_id AND email_confirmed_at IS NOT NULL) THEN
      RAISE EXCEPTION 'Please verify your email address before posting reviews.' USING ERRCODE = 'P0001';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.reviewer_id AND guidelines_accepted_at IS NOT NULL) THEN
      RAISE EXCEPTION 'Please accept the Review Guidelines before posting.' USING ERRCODE = 'P0001';
    END IF;
    IF (SELECT count(*) FROM public.reviews WHERE reviewer_id = NEW.reviewer_id AND created_at > now() - interval '24 hours') >= 5 THEN
      RAISE EXCEPTION 'Daily limit reached: you can post up to 5 reviews per day.' USING ERRCODE = 'P0001';
    END IF;
    NEW.status := 'visible';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT _is_admin THEN
      RAISE EXCEPTION 'Only moderators can change review visibility.' USING ERRCODE = 'P0001';
    END IF;
    IF NOT _is_admin OR _uid = OLD.reviewer_id THEN
      NEW.profile_id := OLD.profile_id;
      NEW.reviewer_id := OLD.reviewer_id;
    END IF;
  END IF;
  IF public.review_contains_abuse(NEW.body) THEN
    RAISE EXCEPTION 'Your review contains language that breaks our Review Guidelines.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reviews_validate BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_review();

-- Replies (one per review, by profile owner)
CREATE TABLE public.review_replies (
  review_id uuid PRIMARY KEY REFERENCES public.reviews(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) > 0 AND char_length(body) <= 250),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.review_replies TO anon;
GRANT SELECT, INSERT, DELETE ON public.review_replies TO authenticated;
GRANT ALL ON public.review_replies TO service_role;
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Replies are public" ON public.review_replies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Profile owners can reply once" ON public.review_replies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.profile_id = auth.uid()));
CREATE POLICY "Admins can delete replies" ON public.review_replies FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.validate_reply()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.review_contains_abuse(NEW.body) THEN
    RAISE EXCEPTION 'Your reply contains language that breaks our Review Guidelines.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER review_replies_validate BEFORE INSERT ON public.review_replies
  FOR EACH ROW EXECUTE FUNCTION public.validate_reply();

-- Reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('harassment','false_information','spam','other')),
  details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 500),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, reporter_id)
);
CREATE INDEX reports_status_idx ON public.reports(status, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can file reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id AND status = 'open');
CREATE POLICY "Users see own reports, admins see all" ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update reports" ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Search: only count visible reviews
CREATE OR REPLACE FUNCTION public.search_profiles(
  _q text DEFAULT '', _location text DEFAULT '', _min_rating numeric DEFAULT 0,
  _sort text DEFAULT 'rating', _limit int DEFAULT 12, _offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid, full_name text, headline text, company text, location text,
  avatar_url text, created_at timestamptz, avg_rating numeric, review_count bigint, total_count bigint
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  WITH stats AS (
    SELECT p.id, p.full_name, p.headline, p.company, p.location, p.avatar_url, p.created_at,
      COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0) AS avg_rating,
      COUNT(r.id) AS review_count
    FROM public.profiles p
    LEFT JOIN public.reviews r ON r.profile_id = p.id AND r.status = 'visible'
    WHERE (coalesce(_q,'') = '' OR p.full_name ILIKE '%' || _q || '%' OR p.company ILIKE '%' || _q || '%' OR p.headline ILIKE '%' || _q || '%')
      AND (coalesce(_location,'') = '' OR p.location ILIKE '%' || _location || '%')
    GROUP BY p.id
  ), filtered AS (
    SELECT * FROM stats WHERE coalesce(_min_rating,0) <= 0 OR avg_rating >= _min_rating
  )
  SELECT f.*, COUNT(*) OVER () AS total_count
  FROM filtered f
  ORDER BY
    CASE WHEN _sort = 'reviews' THEN f.review_count END DESC NULLS LAST,
    CASE WHEN _sort = 'newest' THEN f.created_at END DESC NULLS LAST,
    CASE WHEN _sort NOT IN ('reviews','newest') THEN f.avg_rating END DESC NULLS LAST,
    f.review_count DESC, f.created_at DESC
  LIMIT LEAST(GREATEST(_limit,1),50) OFFSET GREATEST(_offset,0);
$$;