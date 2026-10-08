import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Flag, MessageSquareReply } from "lucide-react";
import { toast } from "sonner";

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
};

function initials(name: string) {
  return (name.trim() || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function ReviewItem({
  review, profileId, profileName, myId,
}: { review: ReviewRow; profileId: string; profileName: string; myId: string | null }) {
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
      toast.error(error.code === "23505" ? "You've already reported this review." : error.message);
      return;
    }
    toast.success("Thanks — our moderators will take a look.");
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
      toast.error(error.code === "23505" ? "You've already replied to this review." : error.message);
      return;
    }
    toast.success("Reply posted");
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
                {review.reviewer.full_name || "Anonymous"}
              </Link>
            ) : <span className="font-semibold">Anonymous</span>}
            <p className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</p>
          </div>
          <StarRating value={review.rating} />
        </div>
        {review.status === "hidden" && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            This review has been hidden by a moderator and is only visible to you.
          </p>
        )}
        <p className="text-sm text-foreground/90">{review.body}</p>

        {review.reply && (
          <div className="ml-4 border-l-2 border-primary/40 pl-3">
            <p className="text-xs font-semibold text-primary">Response from {profileName || "the professional"}</p>
            <p className="text-sm text-foreground/90">{review.reply.body}</p>
          </div>
        )}

        {replying && (
          <div className="ml-4 space-y-2">
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Write a public reply (you can only reply once)…" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-destructive">{replyAbusive ? "Please remove abusive language." : ""}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${reply.length > 250 ? "text-destructive" : "text-muted-foreground"}`}>{reply.length}/250</span>
                <Button size="sm" variant="ghost" onClick={() => setReplying(false)}>Cancel</Button>
                <Button size="sm" onClick={submitReply} disabled={busy || !reply.trim() || reply.length > 250 || replyAbusive}>Post reply</Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-1">
          {isOwner && !review.reply && !replying && (
            <Button size="sm" variant="ghost" onClick={() => setReplying(true)}>
              <MessageSquareReply className="size-4" />Reply
            </Button>
          )}
          {!isMine && (
            myId ? (
              <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setReportOpen(true)}>
                <Flag className="size-4" />Report
              </Button>
            ) : (
              <Button size="sm" variant="ghost" className="text-muted-foreground" asChild>
                <Link to="/auth"><Flag className="size-4" />Report</Link>
              </Button>
            )
          )}
        </div>
      </CardContent>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this review</DialogTitle>
            <DialogDescription>Tell us why this review breaks our guidelines.</DialogDescription>
          </DialogHeader>
          <RadioGroup value={reason} onValueChange={setReason} className="space-y-1">
            {REPORT_REASONS.map((r) => (
              <div key={r.value} className="flex items-center gap-2">
                <RadioGroupItem value={r.value} id={`r-${review.id}-${r.value}`} />
                <Label htmlFor={`r-${review.id}-${r.value}`}>{r.label}</Label>
              </div>
            ))}
          </RadioGroup>
          <Textarea value={details} maxLength={500} onChange={(e) => setDetails(e.target.value)} placeholder="Additional details (optional)" rows={3} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button onClick={submitReport} disabled={!reason || busy}>Submit report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
