import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewForm } from "@/components/ReviewForm";
import { StatusBadge } from "@/components/ProfileBadges";
import { initials } from "@/components/ProfileCard";
import { useAuthUser } from "@/hooks/useAuthUser";

export const Route = createFileRoute("/r/$slug")({
  head: () => ({
    meta: [
      { title: "Leave a review — CoWorker" },
      { name: "description", content: "You've been invited to review a colleague on CoWorker." },
      { property: "og:title", content: "Leave a review — CoWorker" },
      { property: "og:description", content: "Share what it was like to work with this professional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReviewLinkPage,
});

function ReviewLinkPage() {
  const { t } = useTranslation("profile");
  const { slug } = Route.useParams();
  const user = useAuthUser();

  const profileQ = useQuery({
    queryKey: ["review-link", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles")
        .select("id, full_name, headline, company, avatar_url, status, status_return_date")
        .eq("review_slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const mineQ = useQuery({
    queryKey: ["my-review-for", profileQ.data?.id, user?.id],
    enabled: !!user && !!profileQ.data,
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews")
        .select("id, rating, body, relationship, worked_company, worked_from, worked_to")
        .eq("profile_id", profileQ.data!.id).eq("reviewer_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (profileQ.isLoading || user === undefined) {
    return <div className="mx-auto max-w-xl space-y-4 px-4 py-10"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;
  }
  const p = profileQ.data;
  if (profileQ.isError || !p) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">{t("review_link.invalid_title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("review_link.invalid_desc")}</p>
        <Button asChild className="mt-6"><Link to="/search">{t("review_link.find_professionals")}</Link></Button>
      </div>
    );
  }
  const redirect = `/r/${slug}`;

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-10">
      <div className="flex flex-col items-center text-center">
        <Avatar className="size-24">
          <AvatarImage src={p.avatar_url ?? undefined} alt={p.full_name} />
          <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">{initials(p.full_name)}</AvatarFallback>
        </Avatar>
        <h1 className="mt-3 text-2xl font-bold">
          {t("review_link.question", { name: p.full_name || t("review_link.question_default") })}
        </h1>
        {p.headline && <p className="text-foreground/80">{p.headline}</p>}
        {p.company && <p className="flex items-center gap-1 text-sm text-muted-foreground"><Building2 className="size-4" />{p.company}</p>}
        <StatusBadge status={p.status} returnDate={p.status_return_date} className="mt-2" />
      </div>

      {!user ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="font-semibold">{t("review_link.sign_in_title")}</p>
            <p className="text-sm text-muted-foreground">{t("review_link.sign_in_desc")}</p>
            <div className="flex gap-2">
              <Button asChild><Link to="/auth" search={{ mode: "signup", redirect }}>{t("review_link.create_account")}</Link></Button>
              <Button variant="outline" asChild><Link to="/auth" search={{ redirect }}>{t("review_link.sign_in_btn")}</Link></Button>
            </div>
          </CardContent>
        </Card>
      ) : user.id === p.id ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t("review_link.own_link_note")}
        </CardContent></Card>
      ) : mineQ.isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <ReviewForm profileId={p.id} reviewerId={user.id} existing={mineQ.data ?? null} />
      )}

      <p className="text-center text-sm">
        <Link to="/profile/$id" params={{ id: p.id }} className="text-primary hover:underline">{t("review_link.view_profile")}</Link>
      </p>
    </div>
  );
}
