import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { requestWorkEmailCode } from "@/lib/work-email.functions";

export function WorkEmailSettings({ userId }: { userId: string }) {
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
      const res = await requestCode({ data: { email } });
      if (!res.ok) { toast.error(res.error); return; }
      setStage("code");
      if (res.sent) toast.success("Code sent — check your work inbox");
      else toast.warning("Your code was created, but email sending isn't switched on yet, so it can't be delivered.");
    } catch {
      toast.error("Please enter a valid work email.");
    } finally { setBusy(false); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.rpc("verify_work_email", { _code: code });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Work email verified at ${data}`);
    setStage("email"); setEmail(""); setCode("");
    qc.invalidateQueries({ queryKey: ["work-emails"] });
    qc.invalidateQueries({ queryKey: ["verified-colleagues"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("verified_work_emails").delete().eq("id", id);
    if (error) { toast.error("Couldn't remove it."); return; }
    toast.success("Work email removed");
    qc.invalidateQueries({ queryKey: ["work-emails"] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Verified work email</CardTitle>
        <CardDescription>
          When you and a reviewer both verify an email at the same company, their review gets a "Verified colleague" badge.
          Only the company domain is used — your email is never shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {q.isLoading ? <Skeleton className="h-10" /> : (q.data ?? []).map((w) => (
          <div key={w.id} className="flex items-center gap-2 text-sm">
            <BadgeCheck className="size-4 text-success" />
            <span className="flex-1">Verified at <span className="font-semibold">{w.domain}</span></span>
            <Button variant="ghost" size="icon" aria-label={`Remove ${w.domain}`} onClick={() => remove(w.id)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
        {stage === "email" ? (
          <form onSubmit={send} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="we">Work email</Label>
              <Input id="we" type="email" required value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <Button type="submit" disabled={busy || !email}>{busy ? "Sending…" : "Send code"}</Button>
          </form>
        ) : (
          <form onSubmit={verify} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="wcode">6-digit code sent to {email}</Label>
              <Input id="wcode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            </div>
            <Button type="submit" disabled={busy || code.length !== 6}>Verify</Button>
            <Button type="button" variant="ghost" onClick={() => setStage("email")}>Change email</Button>
          </form>
        )}
        <p className="text-xs text-muted-foreground">Free email providers (Gmail, Outlook, Yahoo, iCloud, GMX…) can't be used.</p>
      </CardContent>
    </Card>
  );
}
