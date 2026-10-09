CREATE OR REPLACE FUNCTION public.protect_profile_stats()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    NEW.review_count := OLD.review_count;
    NEW.avg_rating := OLD.avg_rating;
  END IF;
  IF NEW.theme NOT IN ('light','dark','system') THEN NEW.theme := 'system'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_protect_stats BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_stats();