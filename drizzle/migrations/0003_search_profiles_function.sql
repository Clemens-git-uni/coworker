CREATE INDEX IF NOT EXISTS reviews_profile_rating_idx ON public.reviews(profile_id, rating);

CREATE OR REPLACE FUNCTION public.search_profiles(
  _q text DEFAULT '',
  _location text DEFAULT '',
  _min_rating numeric DEFAULT 0,
  _sort text DEFAULT 'rating',
  _limit int DEFAULT 12,
  _offset int DEFAULT 0
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
    LEFT JOIN public.reviews r ON r.profile_id = p.id
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

GRANT EXECUTE ON FUNCTION public.search_profiles(text,text,numeric,text,int,int) TO anon, authenticated, service_role;