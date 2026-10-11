import { useEffect } from "react";
import { useBlocker } from "@tanstack/react-router";

/** Warn before closing the tab or navigating within the app while there are unsaved changes. */
export function useUnsavedWarning(when: boolean, message = "You have unsaved changes. Leave anyway?") {
  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [when]);
  useBlocker({ shouldBlockFn: () => (when ? !window.confirm(message) : false), enableBeforeUnload: false });
}
