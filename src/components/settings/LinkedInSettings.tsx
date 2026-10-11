import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Linkedin } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { normalizeLinkedIn } from "@/lib/linkedin";

export function LinkedInSettings({ userId }: { userId: string }) {
  const { t } = useTranslation("settings");
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-linkedin", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profile_linkedin").select("url, is_public").eq("profile_id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [url, setUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setUrl(data?.url ?? ""); setIsPublic(data?.is_public ?? true); }, [data]);

  const normalized = normalizeLinkedIn(url);
  const error = url.trim() && !normalized ? t("linkedin.url.error") : "";
  const dirty = (normalized ?? url.trim()) !== (data?.url ?? "") || isPublic !== (data?.is_public ?? true);

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["my-linkedin", userId] });
    qc.invalidateQueries({ queryKey: ["profile", userId] });
  }

  async function save() {
    if (!normalized) return;
    setBusy(true);
    const { error } = await supabase.from("profile_linkedin").upsert({ profile_id: userId, url: normalized, is_public: isPublic, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setUrl(normalized);
    toast.success(t("linkedin.success.saved"));
    await refresh();
  }

  async function remove() {
    setBusy(true);
    const { error } = await supabase.from("profile_linkedin").delete().eq("profile_id", userId);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("linkedin.success.removed"));
    await refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Linkedin className="size-5 text-primary" />{t("linkedin.title")}</CardTitle>
        <CardDescription>{t("linkedin.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="li-url">{t("linkedin.url.label")}</Label>
          <Input id="li-url" value={url} disabled={isLoading} placeholder={t("linkedin.url.placeholder")} onChange={(e) => setUrl(e.target.value)} aria-invalid={!!error} />
          {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
        </div>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>{t("linkedin.public.label")}</span>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          {data && <Button variant="ghost" size="sm" className="text-destructive" onClick={remove} disabled={busy}>{t("linkedin.remove")}</Button>}
          <Button size="sm" onClick={save} disabled={busy || !normalized || !dirty}>{busy ? t("linkedin.saving") : t("linkedin.save")}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
