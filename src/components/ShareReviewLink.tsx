import { useState } from "react";
import { Copy, QrCode, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ShareReviewLink({ slug, name }: { slug: string; name: string }) {
  const [qrOpen, setQrOpen] = useState(false);
  const url = typeof window === "undefined" ? `/r/${slug}` : `${window.location.origin}/r/${slug}`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    try { await navigator.clipboard.writeText(url); toast.success("Review link copied"); }
    catch { toast.error("Couldn't copy. Please copy the link manually: " + url); }
  }
  async function share() {
    try { await navigator.share({ title: `Review ${name} on CoWorker`, text: `Worked with me? Leave a short review on CoWorker.`, url }); }
    catch (e) { if ((e as Error).name !== "AbortError") toast.error("Sharing failed"); }
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Ask colleagues for reviews</p>
          <p className="text-sm text-muted-foreground">Share your personal link — it opens straight to the review form.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={copy}><Copy className="size-4" />Copy review link</Button>
          {canShare && <Button variant="outline" onClick={share}><Share2 className="size-4" />Share</Button>}
          <Button variant="outline" size="icon" aria-label="Show QR code" onClick={() => setQrOpen(true)}><QrCode className="size-4" /></Button>
        </div>
      </CardContent>
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Your review QR code</DialogTitle>
            <DialogDescription>Scan to open your review link.</DialogDescription>
          </DialogHeader>
          <div className="mx-auto rounded-lg bg-card p-3" style={{ background: "#fff" }}>
            <QRCodeSVG value={url} size={200} />
          </div>
          <p className="break-all text-center text-xs text-muted-foreground">{url}</p>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
