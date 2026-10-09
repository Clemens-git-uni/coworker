import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Creates a one-time code for a work email. Sending the code needs an email
 * sender domain; until one is connected this returns { sent: false }.
 */
export const requestWorkEmailCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string }) => z.object({ email: z.string().trim().email().max(254) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: code, error } = await supabaseAdmin.rpc("create_work_email_code", {
      _user: context.userId,
      _email: data.email,
    });
    if (error || !code) return { ok: false as const, error: error?.message ?? "Could not create a code." };
    // Email delivery is connected later (requires a verified sender domain).
    return { ok: true as const, sent: false };
  });
