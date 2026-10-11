import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface Attr { id: string; label: string; slug: string; keywords: string[] }

function AttrRow({ a, onSaved }: { a: Attr; onSaved: () => void }) {
  const { t } = useTranslation("admin");
  const [label, setLabel] = useState(a.label);
  const [kw, setKw] = useState(a.keywords.join(", "));
  const dirty = label !== a.label || kw !== a.keywords.join(", ");
  async function save() {
    const keywords = kw.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean).slice(0, 40);
    const { error } = await supabase.from("attributes").update({ label: label.trim().slice(0, 40), keywords }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("toast_saved", { name: label }));
    onSaved();
  }
  async function remove() {
    if (!confirm(t("confirm_delete", { name: a.label }))) return;
    const { error } = await supabase.from("attributes").delete().eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("toast_deleted"));
    onSaved();
  }
  return (
    <div className="grid gap-2 border-b py-3 last:border-0 md:grid-cols-[180px_1fr_auto]">
      <Input value={label} onChange={(e) => setLabel(e.target.value)} aria-label={t("attr_label_aria")} />
      <Input value={kw} onChange={(e) => setKw(e.target.value)} aria-label={t("attr_keywords_aria", { name: a.label })} placeholder={t("attr_keywords_placeholder")} />
      <div className="flex gap-1">
        <Button size="sm" onClick={save} disabled={!dirty}>{t("save")}</Button>
        <Button size="icon" variant="ghost" aria-label={t("delete_aria", { name: a.label })} onClick={remove}><Trash2 className="size-4" /></Button>
      </div>
    </div>
  );
}

export function AttributesManager() {
  const { t } = useTranslation("admin");
  const qc = useQueryClient();
  const [newLabel, setNewLabel] = useState("");
  const q = useQuery({
    queryKey: ["attributes-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("attributes").select("id, label, slug, keywords").order("label");
      if (error) throw error;
      return data as Attr[];
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["attributes-admin"] }); qc.invalidateQueries({ queryKey: ["attributes"] }); };

  async function add() {
    const label = newLabel.trim().slice(0, 40);
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) return;
    const { error } = await supabase.from("attributes").insert({ label, slug, keywords: [label.toLowerCase()] });
    if (error) { toast.error(error.code === "23505" ? t("toast_exists") : error.message); return; }
    setNewLabel(""); toast.success(t("toast_added")); refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="mb-2 text-sm text-muted-foreground">
          {t("strengths_info")}
        </p>
        {q.isLoading ? <Skeleton className="h-40" /> : q.isError ? <p className="text-destructive">{t("strengths_error")}</p> :
          (q.data ?? []).map((a) => <AttrRow key={a.id + a.keywords.join()} a={a} onSaved={refresh} />)}
        <div className="mt-4 flex gap-2">
          <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder={t("new_strength_placeholder")} aria-label={t("new_strength_aria")} />
          <Button onClick={add} disabled={!newLabel.trim()}><Plus className="size-4" />{t("add")}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
