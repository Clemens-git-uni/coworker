import { useState } from "react";
import { Copy, QrCode, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ShareReviewLink({ slug, name }: { slug: string; name: string }) {
  const { t } = useTranslation("profile");
  const [qrOpen, setQrOpen] = useState(false);
  const url = typeof window === "undefined" ? `/r/${slug}` : `${window.location.origin}/r/${slug}`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    try { await navigator.clipboard.writeText(url); toast.success(t("share.copy_success")); }
    catch { toast.error(t("share.copy_error", { url })); }
  }
  async function share() {
    try { 
      await navigator.share({ 
        title: t("share.share_title", { name }), 
        text: t("share.share_text"), 
        url 
      }); 
    }
    catch (e) { if ((e as Error).name !== "AbortError") toast.error(t("share.share_error")); }
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{t("share.title")}</p>
          <p className="text-sm text-muted-foreground">{t("share.description")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={copy}><Copy className="size-4" />{t("share.copy")}</Button>
          {canShare && <Button variant="outline" onClick={share}><Share2 className="size-4" />{t("share.share_btn")}</Button>}
          <Button variant="outline" size="icon" aria-label={t("share.qr_aria")} onClick={() => setQrOpen(true)}><QrCode className="size-4" /></Button>
        </div>
      </CardContent>
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("share.qr_dialog_title")}</DialogTitle>
            <DialogDescription>{t("share.qr_dialog_description")}</DialogDescription>
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
