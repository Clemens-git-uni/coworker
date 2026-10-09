import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareReviewLink } from "@/components/ShareReviewLink";

export function ReviewLinkSettings({ userId, slug, name }: { userId: string; slug: string; name: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function regenerate() {
    if (!confirm("Create a new review link? Your old link will stop working.")) return;
    setBusy(true);
    const { error } = await supabase.rpc("regenerate_review_slug");
    setBusy(false);
    if (error) { toast.error("Couldn't create a new link."); return; }
    toast.success("New review link created");
    qc.invalidateQueries({ queryKey: ["profile", userId] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Your review link</CardTitle>
        <CardDescription>A private link that takes colleagues straight to your review form.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ShareReviewLink slug={slug} name={name} />
        <Button variant="ghost" size="sm" onClick={regenerate} disabled={busy}><RefreshCw className="size-4" />Regenerate link</Button>
      </CardContent>
    </Card>
  );
}
