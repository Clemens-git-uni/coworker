ALTER FUNCTION public.validate_review_context() SECURITY INVOKER;

-- Attributes
CREATE TABLE public.attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  keywords text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.attributes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attributes TO authenticated;
GRANT ALL ON public.attributes TO service_role;
ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attributes are public" ON public.attributes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert attributes" ON public.attributes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update attributes" ON public.attributes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete attributes" ON public.attributes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.profile_attributes (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL REFERENCES public.attributes(id) ON DELETE CASCADE,
  mention_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, attribute_id)
);
CREATE INDEX profile_attributes_attr_idx ON public.profile_attributes (attribute_id, mention_count);
GRANT SELECT ON public.profile_attributes TO anon, authenticated;
GRANT ALL ON public.profile_attributes TO service_role;
ALTER TABLE public.profile_attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profile attributes are public" ON public.profile_attributes FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.text_mentions(_body text, _keywords text[])
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM unnest(_keywords) k
    WHERE btrim(k) <> '' AND _body ~* ('\m' || regexp_replace(btrim(k), '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || '\M')
  )
$$;

CREATE OR REPLACE FUNCTION public.recalc_profile_attributes(_pid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.profile_attributes WHERE profile_id = _pid;
  INSERT INTO public.profile_attributes (profile_id, attribute_id, mention_count)
  SELECT _pid, a.id, count(DISTINCT r.id)
  FROM public.attributes a
  JOIN public.reviews r ON r.profile_id = _pid AND r.status = 'visible' AND public.text_mentions(r.body, a.keywords)
  GROUP BY a.id;
END $$;
REVOKE EXECUTE ON FUNCTION public.recalc_profile_attributes(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reviews_attributes_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.body = OLD.body AND NEW.status = OLD.status AND NEW.profile_id = OLD.profile_id THEN RETURN NULL; END IF;
  IF TG_OP IN ('UPDATE','DELETE') THEN PERFORM public.recalc_profile_attributes(OLD.profile_id); END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND (TG_OP = 'INSERT' OR NEW.profile_id <> OLD.profile_id) THEN PERFORM public.recalc_profile_attributes(NEW.profile_id); END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER reviews_attributes AFTER INSERT OR UPDATE OR DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.reviews_attributes_trigger();

CREATE OR REPLACE FUNCTION public.attributes_changed_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p uuid;
BEGIN
  FOR _p IN SELECT DISTINCT profile_id FROM public.reviews LOOP PERFORM public.recalc_profile_attributes(_p); END LOOP;
  RETURN NULL;
END $$;
CREATE TRIGGER attributes_changed AFTER INSERT OR UPDATE OR DELETE ON public.attributes FOR EACH STATEMENT EXECUTE FUNCTION public.attributes_changed_trigger();

-- Work email verification
CREATE TABLE public.verified_work_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  domain text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, domain)
);
CREATE INDEX verified_work_emails_domain_idx ON public.verified_work_emails (domain);
GRANT SELECT, DELETE ON public.verified_work_emails TO authenticated;
GRANT ALL ON public.verified_work_emails TO service_role;
ALTER TABLE public.verified_work_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own work emails read" ON public.verified_work_emails FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own work emails delete" ON public.verified_work_emails FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.work_email_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  domain text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX work_email_codes_user_idx ON public.work_email_codes (user_id, created_at DESC);
GRANT ALL ON public.work_email_codes TO service_role;
ALTER TABLE public.work_email_codes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_free_email_domain(_d text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(_d) = ANY (ARRAY['gmail.com','googlemail.com','outlook.com','hotmail.com','live.com','msn.com','yahoo.com','yahoo.de','ymail.com','icloud.com','me.com','mac.com','gmx.de','gmx.net','gmx.at','gmx.com','web.de','aol.com','proton.me','protonmail.com','mail.com','t-online.de','yandex.com','yandex.ru','zoho.com','tutanota.com','freenet.de','mail.ru','qq.com','163.com'])
$$;

-- Called by the server only (service role): returns the plaintext code to email.
CREATE OR REPLACE FUNCTION public.create_work_email_code(_user uuid, _email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _e text := lower(btrim(_email)); _d text; _code text; _id uuid := gen_random_uuid();
BEGIN
  IF _e !~ '^[^@\s]+@[a-z0-9.-]+\.[a-z]{2,}$' THEN RAISE EXCEPTION 'Please enter a valid email address.' USING ERRCODE = 'P0001'; END IF;
  _d := split_part(_e, '@', 2);
  IF public.is_free_email_domain(_d) THEN RAISE EXCEPTION 'Please use your work email, not a free email provider.' USING ERRCODE = 'P0001'; END IF;
  IF (SELECT count(*) FROM public.work_email_codes WHERE user_id = _user AND created_at > now() - interval '1 hour') >= 5 THEN
    RAISE EXCEPTION 'Too many codes requested. Please try again later.' USING ERRCODE = 'P0001';
  END IF;
  _code := lpad(floor(random() * 1000000)::int::text, 6, '0');
  INSERT INTO public.work_email_codes (id, user_id, email, domain, code_hash) VALUES (_id, _user, _e, _d, md5(_id::text || _code));
  RETURN _code;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_work_email_code(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_work_email_code(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.verify_work_email(_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r public.work_email_codes;
BEGIN
  SELECT * INTO _r FROM public.work_email_codes WHERE user_id = auth.uid() AND expires_at > now() ORDER BY created_at DESC LIMIT 1;
  IF _r.id IS NULL THEN RAISE EXCEPTION 'No active code. Please request a new one.' USING ERRCODE = 'P0001'; END IF;
  IF _r.attempts >= 5 THEN RAISE EXCEPTION 'Too many attempts. Please request a new code.' USING ERRCODE = 'P0001'; END IF;
  IF md5(_r.id::text || btrim(_code)) <> _r.code_hash THEN
    UPDATE public.work_email_codes SET attempts = attempts + 1 WHERE id = _r.id;
    RAISE EXCEPTION 'That code is not correct.' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.verified_work_emails (user_id, email, domain) VALUES (auth.uid(), _r.email, _r.domain)
  ON CONFLICT (user_id, domain) DO UPDATE SET email = EXCLUDED.email, verified_at = now();
  DELETE FROM public.work_email_codes WHERE user_id = auth.uid();
  RETURN _r.domain;
END $$;
REVOKE EXECUTE ON FUNCTION public.verify_work_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_work_email(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.verified_colleague_reviews(_profile uuid)
RETURNS TABLE (review_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id FROM public.reviews r
  WHERE r.profile_id = _profile AND r.status = 'visible'
    AND EXISTS (SELECT 1 FROM public.verified_work_emails a JOIN public.verified_work_emails b ON a.domain = b.domain
                WHERE a.user_id = r.reviewer_id AND b.user_id = r.profile_id)
$$;
GRANT EXECUTE ON FUNCTION public.verified_colleague_reviews(uuid) TO anon, authenticated;

-- Landing page
CREATE OR REPLACE FUNCTION public.platform_stats()
RETURNS TABLE (professionals bigint, reviews bigint, avg_rating numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT count(*) FROM public.profiles WHERE status <> 'inactive'),
         count(r.id), COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)
  FROM public.reviews r JOIN public.profiles p ON p.id = r.profile_id AND p.status <> 'inactive'
  WHERE r.status = 'visible'
$$;
GRANT EXECUTE ON FUNCTION public.platform_stats() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.recently_reviewed(_limit int DEFAULT 12)
RETURNS TABLE (id uuid, full_name text, headline text, company text, location text, avatar_url text,
  avg_rating numeric, review_count bigint, status text, status_return_date date, last_review text, last_review_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.headline, p.company, p.location, p.avatar_url, p.avg_rating::numeric, p.review_count::bigint,
    p.status, p.status_return_date, lr.body, lr.created_at
  FROM public.profiles p
  JOIN LATERAL (SELECT body, created_at FROM public.reviews r WHERE r.profile_id = p.id AND r.status = 'visible' ORDER BY created_at DESC LIMIT 1) lr ON true
  WHERE p.status <> 'inactive'
  ORDER BY lr.created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 24)
$$;
GRANT EXECUTE ON FUNCTION public.recently_reviewed(int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.featured_reviews(_limit int DEFAULT 3)
RETURNS TABLE (id uuid, rating smallint, body text, created_at timestamptz, relationship text, worked_company text,
  helpful_count int, profile_id uuid, profile_name text, reviewer_name text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT r.id, r.rating, r.body, r.created_at, r.relationship, r.worked_company, r.helpful_count,
    p.id, p.full_name, rv.full_name
  FROM public.reviews r
  JOIN public.profiles p ON p.id = r.profile_id AND p.status <> 'inactive'
  JOIN public.profiles rv ON rv.id = r.reviewer_id
  WHERE r.status = 'visible' AND (r.is_featured OR (r.rating >= 4 AND char_length(r.body) >= 60))
  ORDER BY r.is_featured DESC,
    (r.rating * 2 + least(char_length(r.body), 250) / 50.0 + r.helpful_count * 1.5 - r.unhelpful_count
     - extract(epoch FROM now() - r.created_at) / 86400 / 30) DESC
  LIMIT LEAST(GREATEST(_limit, 1), 6)
$$;
GRANT EXECUTE ON FUNCTION public.featured_reviews(int) TO anon, authenticated;

-- Search v3
CREATE OR REPLACE FUNCTION public.search_profiles_v3(
  _q text DEFAULT '', _location text DEFAULT '', _min_rating numeric DEFAULT 0,
  _headlines text[] DEFAULT '{}', _companies text[] DEFAULT '{}', _min_reviews int DEFAULT 0,
  _languages text[] DEFAULT '{}', _min_proficiency text DEFAULT '', _attributes text[] DEFAULT '{}',
  _include_inactive boolean DEFAULT false,
  _sort text DEFAULT 'rating', _limit int DEFAULT 12, _offset int DEFAULT 0
)
RETURNS TABLE (id uuid, full_name text, headline text, company text, location text, avatar_url text, created_at timestamptz,
  avg_rating numeric, review_count bigint, status text, status_return_date date, languages jsonb, top_attributes jsonb, total_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH lvl AS (SELECT CASE _min_proficiency WHEN 'native' THEN 4 WHEN 'professional' THEN 3 WHEN 'conversational' THEN 2 ELSE 1 END AS v),
  base AS (
    SELECT p.* FROM public.profiles p
    WHERE (coalesce(_q,'') = '' OR p.full_name ILIKE '%' || _q || '%' OR p.company ILIKE '%' || _q || '%' OR p.headline ILIKE '%' || _q || '%')
      AND (coalesce(_location,'') = '' OR p.location ILIKE '%' || _location || '%')
      AND (coalesce(_min_rating,0) <= 0 OR p.avg_rating >= _min_rating)
      AND (coalesce(cardinality(_headlines),0) = 0 OR btrim(p.headline) = ANY(_headlines))
      AND (coalesce(cardinality(_companies),0) = 0 OR btrim(p.company) = ANY(_companies))
      AND p.review_count >= coalesce(_min_reviews,0)
      AND (_include_inactive OR p.status <> 'inactive')
      AND (coalesce(cardinality(_languages),0) = 0 OR NOT EXISTS (
        SELECT 1 FROM unnest(_languages) lc WHERE NOT EXISTS (
          SELECT 1 FROM public.profile_languages pl, lvl WHERE pl.profile_id = p.id AND pl.language_code = lc
            AND (CASE pl.proficiency WHEN 'native' THEN 4 WHEN 'professional' THEN 3 WHEN 'conversational' THEN 2 ELSE 1 END) >= lvl.v)))
      AND (coalesce(cardinality(_attributes),0) = 0 OR NOT EXISTS (
        SELECT 1 FROM unnest(_attributes) s WHERE NOT EXISTS (
          SELECT 1 FROM public.profile_attributes pa JOIN public.attributes a ON a.id = pa.attribute_id
          WHERE pa.profile_id = p.id AND a.slug = s AND pa.mention_count >= 3)))
  )
  SELECT b.id, b.full_name, b.headline, b.company, b.location, b.avatar_url, b.created_at, b.avg_rating::numeric, b.review_count::bigint,
    b.status, b.status_return_date,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('code', pl.language_code, 'proficiency', pl.proficiency) ORDER BY pl.language_code) FROM public.profile_languages pl WHERE pl.profile_id = b.id), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(x) FROM (SELECT jsonb_build_object('slug', a.slug, 'label', a.label, 'count', pa.mention_count) x
      FROM public.profile_attributes pa JOIN public.attributes a ON a.id = pa.attribute_id
      WHERE pa.profile_id = b.id AND pa.mention_count >= 3 ORDER BY pa.mention_count DESC LIMIT 3) t), '[]'::jsonb),
    COUNT(*) OVER ()
  FROM base b
  ORDER BY
    CASE WHEN _sort = 'reviews' THEN b.review_count END DESC NULLS LAST,
    CASE WHEN _sort = 'newest' THEN b.created_at END DESC NULLS LAST,
    CASE WHEN _sort NOT IN ('reviews','newest') THEN b.avg_rating END DESC NULLS LAST,
    b.review_count DESC, b.created_at DESC
  LIMIT LEAST(GREATEST(_limit,1),500) OFFSET GREATEST(_offset,0);
$$;
GRANT EXECUTE ON FUNCTION public.search_profiles_v3(text,text,numeric,text[],text[],int,text[],text,text[],boolean,text,int,int) TO anon, authenticated;