import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, ChevronDown, Flag, MessageSquareReply, ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { reviewContextLabel } from "@/lib/profile-meta";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useFormat } from "@/lib/format";

import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/StarRating";
import { containsAbuse, REPORT_REASONS } from "@/lib/moderation";

export type ReviewRow = {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  status: string;
  reviewer: { id: string; full_name: string; avatar_url: string | null } | null;
  reply: { body: string; created_at: string } | null;
  relationship?: string | null;
  worked_company?: string | null;
  worked_from?: string | null;
  worked_to?: string | null;
  helpful_count?: number;
  unhelpful_count?: number;
};

/** Low helpfulness: at least 3 "not helpful" votes and under 25% helpful. */
export function isFlaggedUnhelpful(r: ReviewRow) {
  const h = r.helpful_count ?? 0, u = r.unhelpful_count ?? 0;
  return u >= 3 && h / (h + u) < 0.25;
}

function initials(name: string) {
  return (name.trim() || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function ReviewItem({
  review, profileId, profileName, myId, verified = false, myVote = 0, onVote,
}: {
  review: ReviewRow; profileId: string; profileName: string; myId: string | null;
  verified?: boolean; myVote?: number; onVote?: (reviewId: string, vote: number) => void;
}) {
  const { t } = useTranslation("reviews");
  const { t: tc } = useTranslation("common");
  const fmt = useFormat();
  const flagged = isFlaggedUnhelpful(review);
  const [expanded, setExpanded] = useState(!flagged);
  const context = reviewContextLabel(review);
  const canVote = !!myId && myId !== review.reviewer?.id && myId !== profileId && !!onVote;
  const qc = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const isOwner = myId === profileId;
  const isMine = myId === review.reviewer?.id;

  async function submitReport() {
    if (!myId || !reason) return;
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      review_id: review.id, reporter_id: myId, reason, details: details.trim().slice(0, 500),
    });
    setBusy(false);
    if (error) {
      toast.error(error.code === "23505" ? t("item.toasts.already_reported") : error.message);
      return;
    }
    toast.success(t("item.toasts.report_submitted"));
    setReportOpen(false); setReason(""); setDetails("");
  }

  async function submitReply() {
    if (!myId) return;
    const text = reply.trim();
    if (!text || text.length > 250 || containsAbuse(text)) return;
    setBusy(true);
    const { error } = await supabase.from("review_replies").insert({ review_id: review.id, author_id: myId, body: text });
    setBusy(false);
    if (error) {
      toast.error(error.code === "23505" ? t("item.toasts.already_replied") : error.message);
      return;
    }
    toast.success(t("item.toasts.reply_posted"));
    setReplying(false); setReply("");
    await qc.invalidateQueries({ queryKey: ["reviews", profileId] });
  }

  const replyAbusive = containsAbuse(reply);

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarImage src={review.reviewer?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials(review.reviewer?.full_name ?? "")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            {review.reviewer ? (
              <Link to="/profile/$id" params={{ id: review.reviewer.id }} className="font-semibold hover:underline">
                {review.reviewer.full_name || t("item.anonymous")}
              </Link>
            ) : <span className="font-semibold">{t("item.anonymous")}</span>}
            <p className="text-xs text-muted-foreground">{fmt.date(review.created_at)}</p>
            {(context || verified) && (
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {context && <span>{context}</span>}
                {verified && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0} className="inline-flex items-center gap-1 rounded-full bg-success/15 px-1.5 py-0.5 font-semibold text-success">
                          <BadgeCheck className="size-3" />{t("item.verified_colleague")}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{t("item.verified_colleague_tooltip")}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
          </div>
          <StarRating value={review.rating} />
        </div>
        {review.status === "hidden" && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            {t("item.hidden_notice")}
          </p>
        )}
        {flagged && (
          <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}
            className="flex w-full items-center justify-between rounded-md bg-muted px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent">
            {t("item.unhelpful_flag")}
            <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
          </button>
        )}
        {expanded && <p className="text-sm text-foreground/90">{review.body}</p>}

        {review.reply && (
          <div className="ml-4 border-l-2 border-primary/40 pl-3">
            <p className="text-xs font-semibold text-primary">{t("item.reply_from", { name: profileName || t("item.professional") })}</p>
            <p className="text-sm text-foreground/90">{review.reply.body}</p>
          </div>
        )}

        {replying && (
          <div className="ml-4 space-y-2">
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder={t("item.reply_placeholder")} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-destructive">{replyAbusive ? t("item.reply_abusive") : ""}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${reply.length > 250 ? "text-destructive" : "text-muted-foreground"}`}>{reply.length}/250</span>
                <Button size="sm" variant="ghost" onClick={() => setReplying(false)}>{tc("actions.cancel")}</Button>
                <Button size="sm" onClick={submitReply} disabled={busy || !reply.trim() || reply.length > 250 || replyAbusive}>{t("item.reply_button")}</Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-1">
          <div className="mr-auto flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {canVote ? (
              <>
                <Button size="sm" variant="ghost" aria-pressed={myVote === 1} aria-label={t("item.helpful")}
                  className={cn("h-8 px-2", myVote === 1 && "text-primary")} onClick={() => onVote!(review.id, myVote === 1 ? 0 : 1)}>
                  <ThumbsUp className={cn("size-4", myVote === 1 && "fill-primary/20")} />{t("item.helpful")}
                </Button>
                <Button size="sm" variant="ghost" aria-pressed={myVote === -1} aria-label={t("item.not_helpful")}
                  className={cn("h-8 px-2", myVote === -1 && "text-destructive")} onClick={() => onVote!(review.id, myVote === -1 ? 0 : -1)}>
                  <ThumbsDown className="size-4" />
                </Button>
              </>
            ) : null}
            <span>{t("item.helpful_count", { count: review.helpful_count ?? 0 })}</span>
          </div>
          {isOwner && !review.reply && !replying && (
            <Button size="sm" variant="ghost" onClick={() => setReplying(true)}>
              <MessageSquareReply className="size-4" />{t("item.reply_action")}
            </Button>
          )}
          {!isMine && (
            myId ? (
              <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setReportOpen(true)}>
                <Flag className="size-4" />{t("item.report_action")}
              </Button>
            ) : (
              <Button size="sm" variant="ghost" className="text-muted-foreground" asChild>
                <Link to="/auth" search={{ redirect: `/profile/${profileId}` }}><Flag className="size-4" />{t("item.report_action")}</Link>
              </Button>
            )
          )}
        </div>
      </CardContent>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("item.report_dialog.title")}</DialogTitle>
            <DialogDescription>{t("item.report_dialog.description")}</DialogDescription>
          </DialogHeader>
          <RadioGroup value={reason} onValueChange={setReason} className="space-y-1">
            {REPORT_REASONS.map((r) => (
              <div key={r.value} className="flex items-center gap-2">
                <RadioGroupItem value={r.value} id={`r-${review.id}-${r.value}`} />
                <Label htmlFor={`r-${review.id}-${r.value}`}>{r.label}</Label>
              </div>
            ))}
          </RadioGroup>
          <Textarea value={details} maxLength={500} onChange={(e) => setDetails(e.target.value)} placeholder={t("item.report_dialog.details_placeholder")} rows={3} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>{tc("actions.cancel")}</Button>
            <Button onClick={submitReport} disabled={!reason || busy}>{t("item.report_dialog.submit")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
