-- Theme preference + denormalized review stats
ALTER TABLE public.profiles ADD COLUMN theme text NOT NULL DEFAULT 'system';
ALTER TABLE public.profiles ADD COLUMN review_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN avg_rating numeric(3,2) NOT NULL DEFAULT 0;

UPDATE public.profiles p SET
  review_count = s.c, avg_rating = s.a
FROM (SELECT profile_id, COUNT(*) c, ROUND(AVG(rating)::numeric,2) a FROM public.reviews WHERE status='visible' GROUP BY profile_id) s
WHERE s.profile_id = p.id;

CREATE INDEX profiles_review_count_idx ON public.profiles (review_count DESC);
CREATE INDEX profiles_avg_rating_idx ON public.profiles (avg_rating DESC);
CREATE INDEX profiles_company_idx ON public.profiles (company);
CREATE INDEX profiles_headline_idx ON public.profiles (headline);

CREATE OR REPLACE FUNCTION public.refresh_profile_stats(_pid uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE profile_id=_pid AND status='visible'),
    avg_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric,2) FROM public.reviews WHERE profile_id=_pid AND status='visible'),0)
  WHERE id=_pid;
$$;
REVOKE EXECUTE ON FUNCTION public.refresh_profile_stats(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reviews_stats_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN PERFORM public.refresh_profile_stats(OLD.profile_id); END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN PERFORM public.refresh_profile_stats(NEW.profile_id); END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER reviews_stats AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.reviews_stats_trigger();

-- Bookmarks
CREATE TABLE public.bookmarks (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, profile_id)
);
CREATE INDEX bookmarks_profile_idx ON public.bookmarks (profile_id);
GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own bookmarks read" ON public.bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own bookmarks insert" ON public.bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own bookmarks delete" ON public.bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Messaging
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX conversation_participants_user_idx ON public.conversation_participants (user_id);
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at);
CREATE INDEX messages_sender_idx ON public.messages (sender_id);
CREATE INDEX messages_unread_idx ON public.messages (conversation_id) WHERE read_at IS NULL;

CREATE OR REPLACE FUNCTION public.is_participant(_conv uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id=_conv AND user_id=_user)
$$;

GRANT SELECT ON public.conversations TO authenticated;
GRANT SELECT ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.conversations, public.conversation_participants, public.messages TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants see conversations" ON public.conversations FOR SELECT TO authenticated USING (public.is_participant(id, auth.uid()));
CREATE POLICY "Participants see participants" ON public.conversation_participants FOR SELECT TO authenticated USING (public.is_participant(conversation_id, auth.uid()));
CREATE POLICY "Participants read messages" ON public.messages FOR SELECT TO authenticated USING (public.is_participant(conversation_id, auth.uid()));
CREATE POLICY "Participants send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND read_at IS NULL AND public.is_participant(conversation_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_message()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.body := btrim(NEW.body);
  IF char_length(NEW.body) = 0 OR char_length(NEW.body) > 2000 THEN
    RAISE EXCEPTION 'Message must be between 1 and 2000 characters';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER messages_validate BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.validate_message();

CREATE OR REPLACE FUNCTION public.start_conversation(_other uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _conv uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _other = _me THEN RAISE EXCEPTION 'You cannot message yourself'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=_other) THEN RAISE EXCEPTION 'Profile not found'; END IF;
  SELECT a.conversation_id INTO _conv FROM public.conversation_participants a
    JOIN public.conversation_participants b ON b.conversation_id=a.conversation_id AND b.user_id=_other
    WHERE a.user_id=_me LIMIT 1;
  IF _conv IS NULL THEN
    INSERT INTO public.conversations DEFAULT VALUES RETURNING id INTO _conv;
    INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (_conv,_me),(_conv,_other);
  END IF;
  RETURN _conv;
END $$;
REVOKE EXECUTE ON FUNCTION public.start_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_conversation(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(_conv uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_participant(_conv, auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE public.messages SET read_at=now() WHERE conversation_id=_conv AND sender_id<>auth.uid() AND read_at IS NULL;
  UPDATE public.notifications SET read_at=now() WHERE user_id=auth.uid() AND read_at IS NULL AND link='/messages?c=' || _conv::text;
END $$;

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'message',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_actor_idx ON public.notifications (actor_id);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications read" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

REVOKE EXECUTE ON FUNCTION public.mark_conversation_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.on_message_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  SELECT COALESCE(NULLIF(full_name,''),'Someone') INTO _name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, type, title, body, link, actor_id)
  SELECT cp.user_id, 'message', 'New message from ' || _name, left(NEW.body, 140), '/messages?c=' || NEW.conversation_id::text, NEW.sender_id
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id AND cp.user_id <> NEW.sender_id;
  RETURN NULL;
END $$;
CREATE TRIGGER messages_after_insert AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.on_message_created();

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Filter options + extended search
CREATE OR REPLACE FUNCTION public.profile_filter_options()
RETURNS TABLE (kind text, value text, n bigint) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT 'headline', btrim(headline), COUNT(*) FROM public.profiles WHERE btrim(headline) <> '' GROUP BY btrim(headline)
  UNION ALL
  SELECT 'company', btrim(company), COUNT(*) FROM public.profiles WHERE btrim(company) <> '' GROUP BY btrim(company)
  ORDER BY 1, 3 DESC, 2;
$$;
GRANT EXECUTE ON FUNCTION public.profile_filter_options() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_profiles_v2(
  _q text DEFAULT '', _location text DEFAULT '', _min_rating numeric DEFAULT 0,
  _headlines text[] DEFAULT '{}', _companies text[] DEFAULT '{}', _min_reviews int DEFAULT 0,
  _sort text DEFAULT 'rating', _limit int DEFAULT 12, _offset int DEFAULT 0
)
RETURNS TABLE (id uuid, full_name text, headline text, company text, location text,
  avatar_url text, created_at timestamptz, avg_rating numeric, review_count bigint, total_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.headline, p.company, p.location, p.avatar_url, p.created_at,
    p.avg_rating::numeric, p.review_count::bigint, COUNT(*) OVER () AS total_count
  FROM public.profiles p
  WHERE (coalesce(_q,'') = '' OR p.full_name ILIKE '%' || _q || '%' OR p.company ILIKE '%' || _q || '%' OR p.headline ILIKE '%' || _q || '%')
    AND (coalesce(_location,'') = '' OR p.location ILIKE '%' || _location || '%')
    AND (coalesce(_min_rating,0) <= 0 OR p.avg_rating >= _min_rating)
    AND (coalesce(cardinality(_headlines),0) = 0 OR btrim(p.headline) = ANY(_headlines))
    AND (coalesce(cardinality(_companies),0) = 0 OR btrim(p.company) = ANY(_companies))
    AND p.review_count >= coalesce(_min_reviews,0)
  ORDER BY
    CASE WHEN _sort = 'reviews' THEN p.review_count END DESC NULLS LAST,
    CASE WHEN _sort = 'newest' THEN p.created_at END DESC NULLS LAST,
    CASE WHEN _sort NOT IN ('reviews','newest') THEN p.avg_rating END DESC NULLS LAST,
    p.review_count DESC, p.created_at DESC
  LIMIT LEAST(GREATEST(_limit,1),50) OFFSET GREATEST(_offset,0);
$$;
GRANT EXECUTE ON FUNCTION public.search_profiles_v2(text,text,numeric,text[],text[],int,text,int,int) TO anon, authenticated;