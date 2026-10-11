import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguagesEditor } from "@/components/settings/LanguagesEditor";
import { StatusEditor } from "@/components/settings/StatusEditor";
import { ReviewLinkSettings } from "@/components/settings/ReviewLinkSettings";
import { LinkedInSettings } from "@/components/settings/LinkedInSettings";
import { useUnsavedWarning } from "@/lib/use-unsaved-warning";
import { WorkEmailSettings } from "@/components/settings/WorkEmailSettings";
import { LanguageSelect } from "@/components/LanguageSwitcher";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/profile/edit")({
  head: () => ({
    meta: [
      { title: i18n.t("settings:profile.meta.title") },
      { name: "description", content: i18n.t("settings:profile.meta.description") },
      { property: "og:title", content: i18n.t("settings:profile.meta.ogTitle") },
      { property: "og:description", content: i18n.t("settings:profile.meta.ogDescription") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditProfile,
});

function EditProfile() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useTranslation(["settings", "common"]);
  
  const schema = useMemo(() => z.object({
    full_name: z.string().trim().min(1, t("settings:profile.error.nameRequired")).max(100, t("settings:profile.error.nameMax")),
    headline: z.string().trim().max(120, t("settings:profile.error.headlineMax")),
    company: z.string().trim().max(100, t("settings:profile.error.companyMax")),
    location: z.string().trim().max(100, t("settings:profile.error.locationMax")),
    avatar_url: z.union([z.literal(""), z.string().trim().url(t("settings:profile.error.photoUrl")).max(500, t("settings:profile.error.photoMax"))]),
  }), [t]);

  type Form = z.infer<typeof schema>;

  const [form, setForm] = useState<Form>({ full_name: "", headline: "", company: "", location: "", avatar_url: "" });
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data)
      setForm({
        full_name: data.full_name || "",
        headline: data.headline || "",
        company: data.company || "",
        location: data.location || "",
        avatar_url: data.avatar_url ?? "",
      });
  }, [data]);

  const original: Form = data
    ? { full_name: data.full_name || "", headline: data.headline || "", company: data.company || "", location: data.location || "", avatar_url: data.avatar_url ?? "" }
    : form;
  
  const dirty = (Object.keys(form) as (keyof Form)[]).some((k) => (form[k] || "").trim() !== (original[k] || "").trim());
  const check = schema.safeParse(form);
  const validationError = check.success ? "" : check.error.issues[0]?.message ?? "";
  useUnsavedWarning(dirty && !saving);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("settings:profile.error.invalid"));
      return;
    }
    setSaving(true);
    const v = parsed.data;
    const { error } = await supabase
      .from("profiles")
      .update({ ...v, avatar_url: v.avatar_url || null, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["profile", user.id] });
    toast.success(t("settings:profile.success"));
  }

  const field = (key: keyof Form, label: string, placeholder = "") => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("common:language.label")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <LanguageSelect id="profile-lang" />
          <p className="text-sm text-muted-foreground">{t("common:language.help")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("settings:profile.editTitle")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {field("full_name", t("settings:profile.fullName"))}
            {field("headline", t("settings:profile.headline.label"), t("settings:profile.headline.placeholder"))}
            {field("company", t("settings:profile.company"))}
            {field("location", t("settings:profile.location.label"), t("settings:profile.location.placeholder"))}
            {field("avatar_url", t("settings:profile.avatarUrl.label"), t("settings:profile.avatarUrl.placeholder"))}
            {dirty && validationError && <p className="text-sm text-destructive" role="alert">{validationError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => navigate({ to: "/profile/$id", params: { id: user.id } })}>
                {t("settings:profile.cancel")}
              </Button>
              <Button type="submit" disabled={saving || !dirty || !!validationError}>{saving ? t("settings:profile.saving") : t("settings:profile.saveChanges")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <LinkedInSettings userId={user.id} />
      <LanguagesEditor userId={user.id} />
      {data && <StatusEditor userId={user.id} initial={{ status: data.status, status_return_date: data.status_return_date, status_note: data.status_note }} />}
      {data && <ReviewLinkSettings userId={user.id} slug={data.review_slug} name={data.full_name} />}
      <WorkEmailSettings userId={user.id} />
    </div>
  );
}
