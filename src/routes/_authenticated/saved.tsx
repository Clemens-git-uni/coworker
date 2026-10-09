import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileCard, type ProfileSummary } from "@/components/ProfileCard";
import { useBookmarks } from "@/hooks/useBookmarks";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({
    meta: [
      { title: "Saved professionals — CoWorker" },
      { name: "description", content: "Professionals you've saved on CoWorker." },
      { property: "og:title", content: "Saved professionals — CoWorker" },
      { property: "og:description", content: "Your saved professionals on CoWorker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const { ids, query, toggle } = useBookmarks();
  const order = (query.data ?? []).map((b) => b.profile_id);
  const key = [...order].sort().join(",");

  const profilesQ = useQuery({
    queryKey: ["saved-profiles", key],
    enabled: order.length > 0,
    queryFn: async (): Promise<ProfileSummary[]> => {
      const { data, error } = await supabase.from("profiles")
        .select("id, full_name, headline, company, location, avatar_url, avg_rating, review_count")
        .in("id", order);
      if (error) throw error;
      return data;
    },
  });

  const byId = new Map((profilesQ.data ?? []).map((p) => [p.id, p]));
  const list = order.filter((id) => ids.has(id)).map((id) => byId.get(id)).filter(Boolean) as ProfileSummary[];
  const loading = query.isLoading || (order.length > 0 && profilesQ.isLoading);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Saved professionals</h1>
      {query.isError || profilesQ.isError ? (
        <Card className="mt-6"><CardContent className="py-10 text-center text-destructive">Couldn't load your saved list. Please refresh.</CardContent></Card>
      ) : loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : list.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10"><Bookmark className="size-6 text-primary" /></span>
            <p className="font-semibold">Nothing saved yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">Tap the bookmark icon on any professional to keep them here for later.</p>
            <Button asChild className="mt-2"><Link to="/search">Find professionals</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <ProfileCard key={p.id} p={p} action={
              <Button variant="ghost" size="icon" className="size-8" aria-label={`Remove ${p.full_name} from Saved`}
                onClick={() => toggle.mutate({ profileId: p.id, saved: true })}>
                <Trash2 className="size-4" />
              </Button>
            } />
          ))}
        </div>
      )}
    </div>
  );
}
