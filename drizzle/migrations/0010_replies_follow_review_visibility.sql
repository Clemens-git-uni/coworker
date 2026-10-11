DROP POLICY IF EXISTS "Replies are public" ON public.review_replies;
CREATE POLICY "Replies visible with their review" ON public.review_replies
FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.reviews r
  WHERE r.id = review_replies.review_id
    AND (r.status = 'visible' OR r.reviewer_id = auth.uid() OR r.profile_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
));