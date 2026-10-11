import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareReviewLink } from "@/components/ShareReviewLink";

export function ReviewLinkSettings({ userId, slug, name }: { userId: string; slug: string; name: string }) {
  const { t } = useTranslation("settings");
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function regenerate() {
    if (!confirm(t("reviewLink.confirmRegenerate"))) return;
    setBusy(true);
    const { error } = await supabase.rpc("regenerate_review_slug");
    setBusy(false);
    if (error) { toast.error(t("reviewLink.error")); return; }
    toast.success(t("reviewLink.success"));
    qc.invalidateQueries({ queryKey: ["profile", userId] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("reviewLink.title")}</CardTitle>
        <CardDescription>{t("reviewLink.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ShareReviewLink slug={slug} name={name} />
        <Button variant="ghost" size="sm" onClick={regenerate} disabled={busy} className="h-auto whitespace-normal"><RefreshCw className="size-4" />{t("reviewLink.regenerate")}</Button>
      </CardContent>
    </Card>
  );
}
