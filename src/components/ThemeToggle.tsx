import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { applyTheme, readTheme, storeTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const { t } = useTranslation();
  const user = useAuthUser();
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => { setTheme(readTheme()); }, []);

  // Follow OS changes while on "system".
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => applyTheme("system");
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [theme]);

  // On sign-in, adopt the theme saved on the profile.
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("theme").eq("id", user.id).maybeSingle().then(({ data }) => {
      const t = data?.theme as Theme | undefined;
      if (t && (t === "light" || t === "dark" || t === "system")) { setTheme(t); storeTheme(t); }
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(t: Theme) {
    setTheme(t);
    storeTheme(t);
    if (user) supabase.from("profiles").update({ theme: t }).eq("id", user.id).then(() => {});
  }

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("theme.label")}>
          <Icon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => choose(v as Theme)}>
          <DropdownMenuRadioItem value="light"><Sun className="size-4" />{t("theme.light")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><Moon className="size-4" />{t("theme.dark")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system"><Monitor className="size-4" />{t("theme.system")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
