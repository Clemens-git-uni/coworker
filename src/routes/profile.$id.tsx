import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { Building2, MapPin, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { StarRating } from "@/components/StarRating";
import { BookmarkButton } from "@/components/BookmarkButton";
import { MessageButton } from "@/components/MessageButton";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewItem, type ReviewRow } from "@/components/ReviewItem";
import { ResultsNavBar } from "@/components/ResultsNavBar";
import { ShareReviewLink } from "@/components/ShareReviewLink";
import { AttributePills, LanguageBadges, StatusBadge } from "@/components/ProfileBadges";
import { LinkedInLink } from "@/components/LinkedInLink";
import { initials } from "@/components/ProfileCard";
import { RELATIONSHIPS } from "@/lib/profile-meta";
import { mentions, profileAttributesQueryOptions, profileLanguagesQueryOptions, profileQueryOptions } from "@/lib/profile-queries";
import { useFormat } from "@/lib/format";

export const Route = createFileRoute("/profile/$id")({
  validateSearch: zodValidator(z.object({ nav: fallback(z.boolean().optional(), undefined) })),
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

const REVIEW_SELECT =
  "id, rating, body, created_at, status, relationship, worked_company, worked_from, worked_to, helpful_count, unhelpful_count, reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, avatar_url), reply:review_replies(body, created_at)";

function ProfilePage() {
  const { t } = useTranslation(["profile", "common"]);
  const { number } = useFormat();
  const { id } = Route.useParams();
  const { nav } = Route.useSearch();
  const qc = useQueryClient();
  const [myId, setMyId] = useState<string | null>(null);
  const [sort, setSort] = useState("newest");
  const [relFilter, setRelFilter] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [attrFilter, setAttrFilter] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, []);
  useEffect(() => { setAttrFilter(null); setRelFilter("all"); setVerifiedOnly(false); }, [id]);

  const profileQ = useQuery(profileQueryOptions(id));
  const langsQ = useQuery(profileLanguagesQueryOptions(id));
  const attrsQ = useQuery(profileAttributesQueryOptions(id));

  const reviewsQ = useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select(REVIEW_SELECT)
        .eq("profile_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        reply: Array.isArray(r.reply) ? (r.reply[0] ?? null) : (r.reply ?? null),
      })) as ReviewRow[];
    },
  });

  const verifiedQ = useQuery({
    queryKey: ["verified-colleagues", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verified_colleague_reviews", { _profile: id });
      if (error) throw error;
      return new Set(data.map((d) => d.review_id));
    },
  });

  const votesQ = useQuery({
    queryKey: ["my-votes", id, myId],
    enabled: !!myId && !!reviewsQ.data?.length,
    queryFn: async () => {
      const ids = reviewsQ.data!.map((r) => r.id);
      const { data, error } = await supabase.from("review_votes").select("review_id, vote").in("review_id", ids);
      if (error) throw error;
      return Object.fromEntries(data.map((v) => [v.review_id, v.vote])) as Record<string, number>;
    },
  });

  async function vote(reviewId: string, v: number) {
    if (!myId) return;
    const prevVotes = votesQ.data ?? {};
    const prevReviews = reviewsQ.data;
    const old = prevVotes[reviewId] ?? 0;
    qc.setQueryData(["my-votes", id, myId], { ...prevVotes, [reviewId]: v });
    qc.setQueryData<ReviewRow[]>(["reviews", id], (rs) => rs?.map((r) => r.id !== reviewId ? r : {
      ...r,
      helpful_count: (r.helpful_count ?? 0) + (v === 1 ? 1 : 0) - (old === 1 ? 1 : 0),
      unhelpful_count: (r.unhelpful_count ?? 0) + (v === -1 ? 1 : 0) - (old === -1 ? 1 : 0),
    }));
    const res = v === 0
      ? await supabase.from("review_votes").delete().eq("review_id", reviewId).eq("user_id", myId)
      : await supabase.from("review_votes").upsert({ review_id: reviewId, user_id: myId, vote: v });
    if (res.error) {
      qc.setQueryData(["my-votes", id, myId], prevVotes);
      qc.setQueryData(["reviews", id], prevReviews);
      toast.error(res.error.message.includes("too fast") ? res.error.message : t("profile:vote.error_generic"));
      return;
    }
    toast.success(v === 0 ? t("profile:vote.removed") : t("profile:vote.saved"), { duration: 2000 });
  }

  const reviews = reviewsQ.data ?? [];
  const verifiedSet = verifiedQ.data ?? new Set<string>();
  const activeAttr = attrsQ.data?.find((a) => a.slug === attrFilter) ?? null;

  const listed = useMemo(() => {
    let list = reviews.filter((r) => r.status === "visible" || r.reviewer?.id === myId);
    if (relFilter !== "all") list = list.filter((r) => r.relationship === relFilter);
    if (verifiedOnly) list = list.filter((r) => verifiedSet.has(r.id));
    if (activeAttr) list = list.filter((r) => mentions(r.body, activeAttr.keywords));
    const sorted = [...list];
    if (sort === "helpful") sorted.sort((a, b) => (b.helpful_count ?? 0) - (a.helpful_count ?? 0) || (a.unhelpful_count ?? 0) - (b.unhelpful_count ?? 0));
    else if (sort === "highest") sorted.sort((a, b) => b.rating - a.rating);
    else if (sort === "lowest") sorted.sort((a, b) => a.rating - b.rating);
    return sorted;
  }, [reviews, relFilter, verifiedOnly, verifiedSet, activeAttr, sort, myId]);

  if (profileQ.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (profileQ.isError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">{t("profile:loading.title")}</h1>
        <Button className="mt-6" onClick={() => profileQ.refetch()}>{t("common:actions.tryAgain")}</Button>
      </div>
    );
  }

  const profile = profileQ.data;
  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">{t("profile:not_found.title")}</h1>
        <Button asChild className="mt-6"><Link to="/">{t("profile:not_found.home")}</Link></Button>
      </div>
    );
  }

  const isOwner = myId === profile.id;
  const visible = reviews.filter((r) => r.status === "visible");
  const total = visible.length;
  const avg = total ? visible.reduce((s, r) => s + r.rating, 0) / total : 0;
  const counts = [5, 4, 3, 2, 1].map((star) => ({ star, count: visible.filter((r) => r.rating === star).length }));
  const returnPassed = isOwner && profile.status !== "active" && profile.status_return_date && profile.status_return_date < new Date().toISOString().slice(0, 10);
  const mine = reviews.find((r) => r.reviewer?.id === myId);

  async function backToActive() {
    const { error } = await supabase.from("profiles").update({ status: "active" }).eq("id", profile!.id);
    if (error) { toast.error(t("profile:active_return.error")); return; }
    toast.success(t("profile:active_return.success"));
    qc.invalidateQueries({ queryKey: ["profile", profile!.id] });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      {nav && <ResultsNavBar id={id} />}

      {returnPassed && (
        <Card className="border-warning/50">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <p className="text-sm">{t("profile:active_return.title")}</p>
            <Button size="sm" onClick={backToActive}>{t("profile:active_return.action")}</Button>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="h-24 bg-primary/15" />
        <CardContent className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar className="size-28 border-4 border-card">
              <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
              <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">{initials(profile.full_name)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{profile.full_name || t("profile:unnamed")}</h1>
                <StatusBadge status={profile.status} returnDate={profile.status_return_date} />
              </div>
              {profile.headline && <p className="text-foreground/80">{profile.headline}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {profile.company && <span className="flex items-center gap-1"><Building2 className="size-4" />{profile.company}</span>}
                {profile.location && <span className="flex items-center gap-1"><MapPin className="size-4" />{profile.location}</span>}
                <LinkedInLink url={profile.linkedin_url} label />
              </div>
              {profile.status !== "active" && profile.status_note && <p className="text-sm italic text-muted-foreground">{profile.status_note}</p>}
              <LanguageBadges languages={langsQ.data ?? []} className="pt-1" />
            </div>
          </div>
          {isOwner ? (
            <Button variant="outline" asChild>
              <Link to="/profile/edit"><Pencil className="size-4" />{t("profile:edit")}</Link>
            </Button>
          ) : (
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <div className="flex gap-2">
                <MessageButton profileId={profile.id} signedIn={!!myId} />
                <BookmarkButton profileId={profile.id} name={profile.full_name} withLabel />
              </div>
              {profile.status !== "active" && (
                <p className="text-xs text-muted-foreground">
                  {t(`profile:status_inactive_note_${profile.status}` as any)}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isOwner && <ShareReviewLink slug={profile.review_slug} name={profile.full_name} />}

      <Card>
        <CardContent className="grid gap-8 pt-6 sm:grid-cols-[200px_1fr]">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="text-5xl font-bold">{total ? number(avg, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "–"}</div>
            <StarRating value={avg} className="mt-2" />
            <p className="mt-1 text-sm text-muted-foreground">{t("profile:reviews_count", { count: number(total) })}</p>
          </div>
          <div className="space-y-2">
            {counts.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="w-12 text-muted-foreground">{t("profile:star_label", { count: star })}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-chart-4" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-right text-muted-foreground">{number(count)}</span>
              </div>
            ))}
          </div>
          {(attrsQ.data?.length ?? 0) > 0 && (
            <div className="space-y-2 sm:col-span-2">
              <p className="text-sm font-semibold">{t("profile:strengths_title")}</p>
              <AttributePills attributes={attrsQ.data!} active={attrFilter} onSelect={(s) => setAttrFilter((cur) => cur === s ? null : s)} />
            </div>
          )}
        </CardContent>
      </Card>

      {myId && !isOwner && !reviewsQ.isLoading && (
        <ReviewForm
          profileId={profile.id}
          reviewerId={myId}
          existing={mine ? { id: mine.id, rating: mine.rating, body: mine.body, relationship: mine.relationship, worked_company: mine.worked_company, worked_from: mine.worked_from, worked_to: mine.worked_to } : null}
        />
      )}
      {!myId && (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 pt-6">
            <p className="text-sm text-muted-foreground">{t("profile:worked_with")}</p>
            <Button asChild size="sm"><Link to="/auth" search={{ redirect: `/profile/${profile.id}` }}>{t("profile:sign_in_to_review")}</Link></Button>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3" aria-labelledby="reviews-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="reviews-h" className="text-lg font-semibold">{t("profile:reviews_heading")}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={relFilter} onValueChange={setRelFilter}>
              <SelectTrigger className="h-9 w-40" aria-label={t("profile:filters.relationship_label")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("profile:filters.relationship_all")}</SelectItem>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {t("profile:filters.relationship_only", { relationship: r.filter.toLowerCase() })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-9 w-36" aria-label={t("profile:filters.sort_label")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t("profile:filters.sort_newest")}</SelectItem>
                <SelectItem value="helpful">{t("profile:filters.sort_helpful")}</SelectItem>
                <SelectItem value="highest">{t("profile:filters.sort_highest")}</SelectItem>
                <SelectItem value="lowest">{t("profile:filters.sort_lowest")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch id="verified-only" checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
              <Label htmlFor="verified-only" className="text-sm">{t("profile:filters.verified_only")}</Label>
            </div>
          </div>
        </div>
        {activeAttr && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("profile:filters.mentioning")}</span>
            <button onClick={() => setAttrFilter(null)} className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground" aria-label={t("profile:filters.clear_filter", { label: activeAttr.label })}>
              {activeAttr.label}<X className="size-3" />
            </button>
          </div>
        )}
        {reviewsQ.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : reviewsQ.isError ? (
          <Card><CardContent className="py-10 text-center text-destructive">{t("profile:reviews_error")}</CardContent></Card>
        ) : total === 0 && listed.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">{t("profile:reviews_empty")}</CardContent></Card>
        ) : listed.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">{t("profile:reviews_no_match")}</CardContent></Card>
        ) : (
          listed.map((r) => (
            <ReviewItem key={r.id} review={r} profileId={profile.id} profileName={profile.full_name} myId={myId}
              verified={verifiedSet.has(r.id)} myVote={votesQ.data?.[r.id] ?? 0} onVote={vote} />
          ))
        )}
      </section>
    </div>
  );
}
