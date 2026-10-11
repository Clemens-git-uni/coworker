import { useEffect } from "react";
import { useBlocker } from "@tanstack/react-router";
import i18n from "@/lib/i18n";

/** Warn before closing the tab or navigating within the app while there are unsaved changes. */
export function useUnsavedWarning(when: boolean) {
  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [when]);
  useBlocker({ shouldBlockFn: () => (when ? !window.confirm(i18n.t("common:unsaved")) : false), enableBeforeUnload: false });
}
