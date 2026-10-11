import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { requestWorkEmailCode } from "@/lib/work-email.functions";

export function WorkEmailSettings({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation("settings");
  const qc = useQueryClient();
  const requestCode = useServerFn(requestWorkEmailCode);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["work-emails", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("verified_work_emails").select("id, domain, verified_at").order("verified_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await requestCode({ data: { email, lang: i18n.language as "en" | "de" } });
      if (!res.ok) { toast.error(res.error); return; }
      setStage("code");
      if (res.sent) toast.success(t("workEmail.success.sent"));
      else toast.warning(t("workEmail.warning.notSent"));
    } catch {
      toast.error(t("workEmail.error.invalid"));
    } finally { setBusy(false); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.rpc("verify_work_email", { _code: code });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("workEmail.success.verified", { domain: data }));
    setStage("email"); setEmail(""); setCode("");
    qc.invalidateQueries({ queryKey: ["work-emails"] });
    qc.invalidateQueries({ queryKey: ["verified-colleagues"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("verified_work_emails").delete().eq("id", id);
    if (error) { toast.error(t("workEmail.error.generic")); return; }
    toast.success(t("workEmail.success.removed"));
    qc.invalidateQueries({ queryKey: ["work-emails"] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("workEmail.title")}</CardTitle>
        <CardDescription>{t("workEmail.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {q.isLoading ? <Skeleton className="h-10" /> : (q.data ?? []).map((w) => (
          <div key={w.id} className="flex items-center gap-2 text-sm">
            <BadgeCheck className="size-4 text-success" />
            <span className="flex-1">{t("workEmail.verifiedAt", { domain: w.domain })}</span>
            <Button variant="ghost" size="icon" aria-label={t("workEmail.removeAria", { domain: w.domain })} onClick={() => remove(w.id)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
        {stage === "email" ? (
          <form onSubmit={send} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="we">{t("workEmail.email.label")}</Label>
              <Input id="we" type="email" required value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} placeholder={t("workEmail.email.placeholder")} />
            </div>
            <Button type="submit" disabled={busy || !email} className="h-auto whitespace-normal">{busy ? t("workEmail.sending") : t("workEmail.sendCode")}</Button>
          </form>
        ) : (
          <form onSubmit={verify} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="wcode">{t("workEmail.code.label", { email })}</Label>
              <Input id="wcode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            </div>
            <Button type="submit" disabled={busy || code.length !== 6} className="h-auto whitespace-normal">{t("workEmail.verify")}</Button>
            <Button type="button" variant="ghost" onClick={() => setStage("email")} className="h-auto whitespace-normal">{t("workEmail.changeEmail")}</Button>
          </form>
        )}
        <p className="text-xs text-muted-foreground">{t("workEmail.help")}</p>
      </CardContent>
    </Card>
  );
}
