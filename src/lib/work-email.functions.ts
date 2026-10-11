import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Creates a one-time code for a work email. Sending the code needs an email
 * sender domain; until one is connected this returns { sent: false }.
 */
export const requestWorkEmailCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; lang?: "en" | "de" }) => 
    z.object({ 
      email: z.string().trim().email().max(254),
      lang: z.enum(["en", "de"]).optional()
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: code, error } = await supabaseAdmin.rpc("create_work_email_code", {
      _user: context.userId,
      _email: data.email,
    });

    const lang = data.lang || "en";
    const messages = {
      en: { error: "Could not create a code.", subject: "Your CoWorker verification code" },
      de: { error: "Code konnte nicht erstellt werden.", subject: "Dein CoWorker-Bestätigungscode" }
    };

    if (error || !code) return { ok: false as const, error: error?.message ?? messages[lang].error };
    
    // Email delivery is connected later (requires a verified sender domain).
    // The email body would use the 'code' and 'lang' here.
    return { ok: true as const, sent: false };
  });
