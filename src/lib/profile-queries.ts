import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProfileAttribute, ProfileLanguage } from "@/lib/profile-meta";

export const profileQueryOptions = (id: string) => queryOptions({
  queryKey: ["profile", id],
  queryFn: async () => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const profileLanguagesQueryOptions = (id: string) => queryOptions({
  queryKey: ["profile-languages", id],
  queryFn: async (): Promise<ProfileLanguage[]> => {
    const { data, error } = await supabase.from("profile_languages").select("language_code, proficiency").eq("profile_id", id).order("language_code");
    if (error) throw error;
    return data.map((d) => ({ code: d.language_code, proficiency: d.proficiency as ProfileLanguage["proficiency"] }));
  },
});

export const profileAttributesQueryOptions = (id: string) => queryOptions({
  queryKey: ["profile-attributes", id],
  queryFn: async (): Promise<(ProfileAttribute & { keywords: string[] })[]> => {
    const { data, error } = await supabase.from("profile_attributes")
      .select("mention_count, attribute:attributes(slug, label, keywords)")
      .eq("profile_id", id).gte("mention_count", 3).order("mention_count", { ascending: false });
    if (error) throw error;
    return data.filter((d) => d.attribute).map((d) => ({ slug: d.attribute!.slug, label: d.attribute!.label, keywords: d.attribute!.keywords, count: d.mention_count }));
  },
});

/** Client-side mirror of the database's whole-phrase, case-insensitive match. */
export function mentions(body: string, keywords: string[]) {
  return keywords.some((k) => {
    const esc = k.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return esc && new RegExp(`(^|[^\\p{L}\\p{N}_])${esc}($|[^\\p{L}\\p{N}_])`, "iu").test(body);
  });
}
