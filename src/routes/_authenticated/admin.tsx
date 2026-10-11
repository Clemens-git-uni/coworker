import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StarRating } from "@/components/StarRating";
import { reasonLabel } from "@/lib/moderation";
import { useFormat } from "@/lib/format";
import { AttributesManager } from "@/components/AttributesManager";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Moderation — CoWorker" },
      { name: "description", content: "Review reports and moderate content on CoWorker." },
      { property: "og:title", content: "Moderation — CoWorker" },
      { property: "og:description", content: "CoWorker moderation dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Status = "open" | "resolved" | "dismissed" | "strengths";

function AdminPage() {
  const { t } = useTranslation("admin");
  const format = useFormat();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Status>("open");

  const roleQ = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (error) throw error;
      return !!data;
    },
  });

  const reportsQ = useQuery({
    queryKey: ["reports", tab],
    enabled: roleQ.data === true && tab !== "strengths",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, reason, details, status, created_at, reporter:profiles!reports_reporter_id_fkey(full_name), review:reviews(id, rating, body, status, profile_id, created_at, reviewer:profiles!reviews_reviewer_id_fkey(full_name), subject:profiles!reviews_profile_id_fkey(full_name))")
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  async function act(fn: () => PromiseLike<{ error: { message: string } | null }>, msg: string) {
    const { error } = await fn();
    if (error) { toast.error(error.message); return; }
    toast.success(msg);
    await qc.invalidateQueries({ queryKey: ["reports"] });
  }

  const setReport = (id: string, status: Status) =>
    supabase.from("reports").update({ status }).eq("id", id);

  if (roleQ.isLoading) return <div className="mx-auto max-w-4xl px-4 py-8"><Skeleton className="h-40" /></div>;
  if (!roleQ.data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">{t("access_denied")}</h1>
        <p className="mt-2 text-muted-foreground">{t("access_denied_desc")}</p>
        <Button asChild className="mt-6"><Link to="/">{t("go_home")}</Link></Button>
      </div>
    );
  }

  const reports = reportsQ.data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
        <TabsList>
          <TabsTrigger value="open">{t("tabs.open")}</TabsTrigger>
          <TabsTrigger value="resolved">{t("tabs.resolved")}</TabsTrigger>
          <TabsTrigger value="dismissed">{t("tabs.dismissed")}</TabsTrigger>
          <TabsTrigger value="strengths">{t("tabs.strengths")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "strengths" ? (
        <AttributesManager />
      ) : reportsQ.isLoading ? (
        <Skeleton className="h-32" />
      ) : reports.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">{t("no_reports", { status: t(`tabs.${tab}`) })}</CardContent></Card>
      ) : (
        reports.map((r) => (
          <Card key={r.id}>
            <CardContent className="space-y-3 pt-6">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="destructive">{t(`reasons.${r.reason}`) || r.reason}</Badge>
                <span className="text-muted-foreground">
                  {t("reported_by", { name: r.reporter?.full_name || t("reported_by_user"), date: format.date(r.created_at, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) })}
                </span>
              </div>
              {r.details && <p className="text-sm italic text-foreground/80">“{r.details}”</p>}
              {r.review ? (
                <div className="rounded-md border bg-muted/40 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <StarRating value={r.review.rating} />
                    <span className="font-semibold">{r.review.reviewer?.full_name || t("anonymous")}</span>
                    <span className="text-muted-foreground">{t("on")}</span>
                    <Link to="/profile/$id" params={{ id: r.review.profile_id }} className="font-semibold text-primary hover:underline">
                      {r.review.subject?.full_name || t("profile")}
                    </Link>
                    {r.review.status === "hidden" && <Badge variant="secondary">{t("hidden_badge")}</Badge>}
                  </div>
                  <p className="mt-2 text-sm">{r.review.body}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("review_removed")}</p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                {r.review && (
                  r.review.status === "visible" ? (
                    <Button size="sm" variant="outline" onClick={() => act(async () => {
                      const res = await supabase.from("reviews").update({ status: "hidden" }).eq("id", r.review!.id);
                      if (!res.error) await setReport(r.id, "resolved");
                      return res;
                    }, t("toast.review_hidden"))}>{t("hide_review")}</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => act(() =>
                      supabase.from("reviews").update({ status: "visible" }).eq("id", r.review!.id), t("toast.review_restored"))}>
                      {t("unhide")}
                    </Button>
                  )
                )}
                {r.review && (
                  <Button size="sm" variant="destructive" onClick={() => {
                    if (!confirm(t("confirm_remove"))) return;
                    act(() => supabase.from("reviews").delete().eq("id", r.review!.id), t("toast.review_removed"));
                  }}>{t("remove_review")}</Button>
                )}
                {r.status === "open" && (
                  <Button size="sm" variant="ghost" onClick={() => act(() => setReport(r.id, "dismissed"), t("toast.report_dismissed"))}>
                    {t("dismiss")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
