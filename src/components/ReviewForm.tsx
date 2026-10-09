import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RELATIONSHIPS } from "@/lib/profile-meta";
import { containsAbuse } from "@/lib/moderation";

const MAX = 250;

export type ExistingReview = {
  id: string; rating: number; body: string;
  relationship?: string | null; worked_company?: string | null; worked_from?: string | null; worked_to?: string | null;
} | null;

const month = (d?: string | null) => (d ? d.slice(0, 7) : "");
const thisMonth = () => new Date().toISOString().slice(0, 7);

export function ReviewForm({
  profileId,
  reviewerId,
  existing,
}: {
  profileId: string;
  reviewerId: string;
  existing: ExistingReview;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(!existing);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(existing?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [relationship, setRelationship] = useState(existing?.relationship ?? "");
  const [company, setCompany] = useState(existing?.worked_company ?? "");
  const [from, setFrom] = useState(month(existing?.worked_from));
  const [to, setTo] = useState(month(existing?.worked_to));
  const [present, setPresent] = useState(existing ? !existing.worked_to : false);

  useEffect(() => {
    setEditing(!existing);
    setRating(existing?.rating ?? 0);
    setBody(existing?.body ?? "");
    setRelationship(existing?.relationship ?? "");
    setCompany(existing?.worked_company ?? "");
    setFrom(month(existing?.worked_from));
    setTo(month(existing?.worked_to));
    setPresent(existing ? !existing.worked_to : false);
  }, [existing]);

  const { data: companies } = useQuery({
    queryKey: ["filter-options-companies"],
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase.rpc("profile_filter_options");
      return (data ?? []).filter((d) => d.kind === "company").map((d) => d.value);
    },
  });

  const [accept, setAccept] = useState(false);
  const { data: me } = useQuery({
    queryKey: ["review-eligibility", reviewerId],
    queryFn: async () => {
      const [{ data: u }, { data: p }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles").select("guidelines_accepted_at").eq("id", reviewerId).maybeSingle(),
      ]);
      return { verified: !!u.user?.email_confirmed_at, accepted: !!p?.guidelines_accepted_at };
    },
  });
  const emailVerified = me?.verified;
  const needsGuidelines = !existing && me ? !me.accepted : false;

  const len = body.length;
  const abusive = containsAbuse(body);
  const dateError = !from ? "" : from > thisMonth() ? "Start can't be in the future." : !present && to && to < from ? "End can't be before start." : "";
  const contextMissing = !relationship || !company.trim() || !from || (!present && !to);
  const invalid = rating < 1 || body.trim().length === 0 || len > MAX || contextMissing || !!dateError;
  const counterColor =
    len >= MAX ? "text-destructive" : len >= 220 ? "text-warning" : "text-muted-foreground";

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["reviews", profileId] });
    await qc.invalidateQueries({ queryKey: ["review-eligibility", reviewerId] });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid || abusive) return;
    setBusy(true);
    if (needsGuidelines) {
      const { error: gErr } = await supabase
        .from("profiles")
        .update({ guidelines_accepted_at: new Date().toISOString() })
        .eq("id", reviewerId);
      if (gErr) { setBusy(false); toast.error(gErr.message); return; }
    }
    const payload = {
      rating, body: body.trim(), relationship, worked_company: company.trim().slice(0, 100),
      worked_from: `${from}-01`, worked_to: present ? null : `${to}-01`,
    };
    const { error } = existing
      ? await supabase.from("reviews").update(payload).eq("id", existing.id)
      : await supabase.from("reviews").insert({ ...payload, profile_id: profileId, reviewer_id: reviewerId });
    setBusy(false);
    if (error) {
      toast.error(error.code === "23505" ? "You've already reviewed this person." : error.message);
      return;
    }
    toast.success(existing ? "Review updated" : "Review posted");
    await refresh();
  }

  async function remove() {
    if (!existing || !confirm("Delete your review?")) return;
    setBusy(true);
    const { error } = await supabase.from("reviews").delete().eq("id", existing.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Review deleted");
    await refresh();
  }

  if (existing && !editing) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <p className="text-sm text-muted-foreground">You've reviewed this person.</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit review</Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={remove} disabled={busy}>
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!existing && emailVerified === false) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Please verify your email address (check your inbox for the confirmation link) before writing reviews.
        </CardContent>
      </Card>
    );
  }

  const shown = hover || rating;
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">{existing ? "Edit your review" : "Write a review"}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={rating === i}
                aria-label={`${i} star${i > 1 ? "s" : ""}`}
                onMouseEnter={() => setHover(i)}
                onClick={() => setRating(i)}
                className="rounded p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Star
                  className={cn(
                    "size-7 transition-colors",
                    shown >= i ? "fill-chart-4 text-chart-4" : "fill-muted text-muted-foreground/40",
                  )}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-muted-foreground">{rating ? `${rating} of 5` : "Select a rating"}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rel">How did you work together? *</Label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger id="rel" aria-required><SelectValue placeholder="Select relationship" /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wc">Company *</Label>
              <Input id="wc" list="wc-list" value={company} maxLength={100} onChange={(e) => setCompany(e.target.value)} placeholder="Where you worked together" aria-required />
              <datalist id="wc-list">{(companies ?? []).map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wf">From *</Label>
              <Input id="wf" type="month" value={from} max={thisMonth()} onChange={(e) => setFrom(e.target.value)} aria-required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wt">To *</Label>
              <Input id="wt" type="month" value={present ? "" : to} min={from || undefined} max={thisMonth()} disabled={present} onChange={(e) => setTo(e.target.value)} />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={present} onCheckedChange={(v) => setPresent(v === true)} />Still working together (Present)
              </label>
            </div>
            {dateError && <p className="text-xs text-destructive sm:col-span-2" role="alert">{dateError}</p>}
          </div>
          <div className="space-y-1">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share what it's like to work with this person…"
              rows={4}
              aria-label="Review text"
            />
            <div className="flex justify-between gap-2">
              <p className="text-xs text-destructive">{abusive ? "Please remove abusive language — see our Review Guidelines." : ""}</p>
              <p className={cn("text-xs font-medium", counterColor)}>{len}/{MAX}</p>
            </div>
          </div>
          {needsGuidelines && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={accept} onCheckedChange={(v) => setAccept(v === true)} className="mt-0.5" />
              <span>
                I confirm this review is based on real professional experience and follows the{" "}
                <Link to="/guidelines" target="_blank" className="text-primary underline">Review Guidelines</Link>{" "}
                and <Link to="/terms" target="_blank" className="text-primary underline">Terms of Use</Link>.
              </span>
            </label>
          )}
          <div className="flex justify-end gap-2">
            {existing && (
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            )}
            <Button type="submit" disabled={invalid || busy || abusive || (needsGuidelines && !accept)}>
              {busy ? "Saving…" : existing ? "Save review" : "Post review"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
