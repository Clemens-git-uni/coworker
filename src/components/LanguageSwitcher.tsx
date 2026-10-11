import { useEffect } from "react";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { applyLanguage, isUiLanguage, UI_LANGUAGES, type UiLanguage } from "@/lib/i18n";

function useLanguageChoice() {
  const { i18n } = useTranslation();
  const user = useAuthUser();
  const current = (isUiLanguage(i18n.language) ? i18n.language : "en") as UiLanguage;

  // On sign-in, adopt the language saved on the profile.
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("ui_language").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (isUiLanguage(data?.ui_language)) applyLanguage(data.ui_language);
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(lng: UiLanguage) {
    applyLanguage(lng);
    if (user) supabase.from("profiles").update({ ui_language: lng }).eq("id", user.id).then(() => {});
  }
  return { current, choose };
}

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { current, choose } = useLanguageChoice();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 px-2" aria-label={t("language.label")}>
          <Globe className="size-4" /><span className="text-xs font-semibold uppercase">{current}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={current} onValueChange={(v) => choose(v as UiLanguage)}>
          {UI_LANGUAGES.map((l) => <DropdownMenuRadioItem key={l.code} value={l.code}>{l.label}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguageSelect({ id }: { id?: string }) {
  const { current, choose } = useLanguageChoice();
  return (
    <Select value={current} onValueChange={(v) => choose(v as UiLanguage)}>
      <SelectTrigger id={id} className="w-48"><SelectValue /></SelectTrigger>
      <SelectContent>
        {UI_LANGUAGES.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
