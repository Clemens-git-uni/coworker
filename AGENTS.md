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
