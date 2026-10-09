import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Building2, MapPin, Pencil } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/StarRating";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewItem, type ReviewRow } from "@/components/ReviewItem";

export const Route = createFileRoute("/profile/$id")({
  head: () => ({
    meta: [
      { title: "Professional profile — CoWorker" },
      { name: "description", content: "See ratings and reviews from colleagues on CoWorker." },
      { property: "og:title", content: "Professional profile — CoWorker" },
      { property: "og:description", content: "See ratings and reviews from colleagues on CoWorker." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function initials(name: string) {
  return (name.trim() || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function ProfilePage() {
  const { id } = Route.useParams();
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, []);

  const profileQ = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const reviewsQ = useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, body, created_at, status, reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, avatar_url), reply:review_replies(body, created_at)")
        .eq("profile_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        reply: Array.isArray(r.reply) ? (r.reply[0] ?? null) : (r.reply ?? null),
      })) as ReviewRow[];
    },
  });

  if (profileQ.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const profile = profileQ.data;
  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Profile not found</h1>
        <Button asChild className="mt-6"><Link to="/">Go home</Link></Button>
      </div>
    );
  }

  const reviews = reviewsQ.data ?? [];
  const visible = reviews.filter((r) => r.status === "visible");
  const total = visible.length;
  const avg = total ? visible.reduce((s, r) => s + r.rating, 0) / total : 0;
  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: visible.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Card className="overflow-hidden">
        <div className="h-24 bg-primary/15" />
        <CardContent className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar className="size-28 border-4 border-card">
              <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
              <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                {initials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 pb-1">
              <h1 className="text-2xl font-bold">{profile.full_name || "Unnamed professional"}</h1>
              {profile.headline && <p className="text-foreground/80">{profile.headline}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {profile.company && (
                  <span className="flex items-center gap-1"><Building2 className="size-4" />{profile.company}</span>
                )}
                {profile.location && (
                  <span className="flex items-center gap-1"><MapPin className="size-4" />{profile.location}</span>
                )}
              </div>
            </div>
          </div>
          {myId === profile.id && (
            <Button variant="outline" asChild>
              <Link to="/profile/edit"><Pencil className="size-4" />Edit profile</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-8 pt-6 sm:grid-cols-[200px_1fr]">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="text-5xl font-bold">{total ? avg.toFixed(1) : "–"}</div>
            <StarRating value={avg} className="mt-2" />
            <p className="mt-1 text-sm text-muted-foreground">
              {total} {total === 1 ? "review" : "reviews"}
            </p>
          </div>
          <div className="space-y-2">
            {counts.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="w-12 text-muted-foreground">{star} star</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-chart-4"
                    style={{ width: `${total ? (count / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-8 text-right text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {myId && myId !== profile.id && !reviewsQ.isLoading && (
        <ReviewForm
          profileId={profile.id}
          reviewerId={myId}
          existing={(() => {
            const mine = reviews.find((r) => r.reviewer?.id === myId);
            return mine ? { id: mine.id, rating: mine.rating, body: mine.body } : null;
          })()}
        />
      )}
      {!myId && (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 pt-6">
            <p className="text-sm text-muted-foreground">Worked with this person?</p>
            <Button asChild size="sm"><Link to="/auth">Sign in to write a review</Link></Button>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Reviews</h2>
        {reviewsQ.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : total === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No reviews yet.</CardContent></Card>
        ) : (
          reviews.map((r) => (
            <ReviewItem key={r.id} review={r} profileId={profile.id} profileName={profile.full_name} myId={myId} />
          ))
        )}
      </section>
    </div>
  );
}
