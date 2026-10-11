import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";

interface NotificationRow { id: string; title: string; body: string; link: string | null; type: string }

/** One realtime subscription per signed-in session: refreshes counts and shows message pop-ups. */
export function RealtimeNotifier() {
  const { t } = useTranslation("messages");
  const user = useAuthUser();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const href = useRouterState({ select: (s) => s.location.href });
  const hrefRef = useRef(href);
  hrefRef.current = href;

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notify-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        const n = payload.new as NotificationRow;
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["unread-messages"] });
        qc.invalidateQueries({ queryKey: ["conversations"] });
        if (n.type === "message" && n.link && hrefRef.current === n.link) return; // already viewing it
        toast(n.title, {
          description: n.body,
          duration: 5000,
          action: n.link ? { label: t("open_notification"), onClick: () => navigate({ href: n.link! }) } : undefined,
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
