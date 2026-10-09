<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Profile review stats are denormalized on profiles (review_count, avg_rating) and maintained only by a reviews trigger; why: fast filtering/sorting without aggregating reviews per search.
- One realtime notifications subscription lives in RealtimeNotifier (root); thread views add their own per-conversation channel; why: avoid duplicate pop-ups and leaked channels.
- Conversations are created only via the start_conversation RPC; why: participants can't be inserted directly under RLS.
- Theme is applied by an inline head script before paint and persisted in localStorage plus profiles.theme; why: no flash of the wrong theme.
- Review vote counts (helpful_count/unhelpful_count) and profile_attributes are maintained only by triggers; client writes to them are ignored; why: counts can't be faked.
- Profile strengths match review text against attributes.keywords in SQL (text_mentions) and are shown only at >=3 distinct reviews; the client mirror in profile-queries.ts is for highlighting only.
- Work email codes are created via the service-role-only create_work_email_code RPC from a server function and verified via verify_work_email; why: plaintext codes never reach the browser.
- Search uses search_profiles_v3 (older versions kept for compatibility); results order is stored in sessionStorage for profile previous/next, enabled by the ?nav=true flag.
