import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profile/edit")({
  head: () => ({
    meta: [
      { title: "Edit your profile — CoWorker" },
      { name: "description", content: "Update your name, headline, company, location and photo." },
      { property: "og:title", content: "Edit your profile — CoWorker" },
      { property: "og:description", content: "Update your CoWorker professional profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditProfile,
});

const schema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100),
  headline: z.string().trim().max(120),
  company: z.string().trim().max(100),
  location: z.string().trim().max(100),
  avatar_url: z.union([z.literal(""), z.string().trim().url("Photo must be a valid URL").max(500)]),
});
type Form = z.infer<typeof schema>;

function EditProfile() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
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
        full_name: data.full_name,
        headline: data.headline,
        company: data.company,
        location: data.location,
        avatar_url: data.avatar_url ?? "",
      });
  }, [data]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
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
    toast.success("Profile updated");
    navigate({ to: "/profile/$id", params: { id: user.id } });
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
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader><CardTitle>Edit profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {field("full_name", "Full name")}
            {field("headline", "Headline", "e.g. Senior Product Designer")}
            {field("company", "Company")}
            {field("location", "Location", "e.g. Vienna, Austria")}
            {field("avatar_url", "Photo URL", "https://…")}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => navigate({ to: "/profile/$id", params: { id: user.id } })}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
