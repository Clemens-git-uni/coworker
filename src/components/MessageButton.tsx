import { useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function MessageButton({ profileId, signedIn }: { profileId: string; signedIn: boolean }) {
  const { t } = useTranslation("profile");
  const navigate = useNavigate();
  const href = useRouterState({ select: (s) => s.location.href });
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!signedIn) {
      toast(t("message.sign_in"));
      navigate({ to: "/auth", search: { redirect: href } });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("start_conversation", { _other: profileId });
    setBusy(false);
    if (error || !data) { toast.error(t("message.error")); return; }
    navigate({ to: "/messages", search: { c: data } });
  }

  return (
    <Button onClick={go} disabled={busy}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />}
      {t("message.action")}
    </Button>
  );
}
