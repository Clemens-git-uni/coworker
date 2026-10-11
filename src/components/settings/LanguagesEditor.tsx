import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LANGUAGES, PROFICIENCIES, languageName, type ProfileLanguage, type Proficiency } from "@/lib/profile-meta";
import { profileLanguagesQueryOptions } from "@/lib/profile-queries";

export function LanguagesEditor({ userId }: { userId: string }) {
  const { t } = useTranslation("settings");
  const qc = useQueryClient();
  const q = useQuery(profileLanguagesQueryOptions(userId));
  const [rows, setRows] = useState<ProfileLanguage[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (q.data) setRows(q.data); }, [q.data]);

  const available = LANGUAGES.filter((l) => !rows.some((r) => r.code === l.code));

  async function save() {
    setSaving(true);
    const del = await supabase.from("profile_languages").delete().eq("profile_id", userId);
    const ins = rows.length && !del.error
      ? await supabase.from("profile_languages").insert(rows.map((r) => ({ profile_id: userId, language_code: r.code, proficiency: r.proficiency })))
      : { error: del.error };
    setSaving(false);
    if (ins.error) { toast.error(t("languages.error")); return; }
    toast.success(t("languages.success"));
    qc.invalidateQueries({ queryKey: ["profile-languages", userId] });
    qc.invalidateQueries({ queryKey: ["search"] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("languages.title")}</CardTitle>
        <CardDescription>{t("languages.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {q.isLoading ? <Skeleton className="h-20" /> : (
          <>
            {rows.length === 0 && <p className="text-sm text-muted-foreground">{t("languages.empty")}</p>}
            {rows.map((r) => (
              <div key={r.code} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{languageName(r.code)}</span>
                <Select value={r.proficiency} onValueChange={(v) => setRows((rs) => rs.map((x) => x.code === r.code ? { ...x, proficiency: v as Proficiency } : x))}>
                  <SelectTrigger className="h-9 w-40" aria-label={t("languages.proficiencyAria", { language: languageName(r.code) })}><SelectValue /></SelectTrigger>
                  <SelectContent>{PROFICIENCIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="ghost" size="icon" aria-label={t("languages.removeAria", { language: languageName(r.code) })} onClick={() => setRows((rs) => rs.filter((x) => x.code !== r.code))}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap justify-between gap-2 pt-1">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" role="combobox" aria-expanded={open} disabled={rows.length >= 15}>
                    <Plus className="size-4" />{t("languages.add")}<ChevronsUpDown className="size-3 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-60 p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("languages.search")} />
                    <CommandList>
                      <CommandEmpty>{t("languages.notFound")}</CommandEmpty>
                      <CommandGroup>
                        {available.map((l) => (
                          <CommandItem key={l.code} value={l.name} onSelect={() => { setRows((rs) => [...rs, { code: l.code, proficiency: "professional" }]); setOpen(false); }}>
                            <Check className="size-4 opacity-0" />{l.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button size="sm" onClick={save} disabled={saving}>{saving ? t("languages.saving") : t("languages.save")}</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
