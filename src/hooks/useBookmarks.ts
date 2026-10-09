import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "./useAuthUser";

export interface Bookmark { profile_id: string; created_at: string }

export function useBookmarks() {
  const user = useAuthUser();
  const qc = useQueryClient();
  const key = ["bookmarks", user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async (): Promise<Bookmark[]> => {
      const { data, error } = await supabase.from("bookmarks").select("profile_id, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ profileId, saved }: { profileId: string; saved: boolean }) => {
      if (!user) throw new Error("Not signed in");
      const res = saved
        ? await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("profile_id", profileId)
        : await supabase.from("bookmarks").insert({ user_id: user.id, profile_id: profileId });
      if (res.error) throw res.error;
    },
    onMutate: async ({ profileId, saved }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Bookmark[]>(key);
      qc.setQueryData<Bookmark[]>(key, (old = []) =>
        saved ? old.filter((b) => b.profile_id !== profileId) : [{ profile_id: profileId, created_at: new Date().toISOString() }, ...old]);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(key, ctx?.prev);
      toast.error("Couldn't update your saved list. Please try again.");
    },
    onSuccess: (_d, { saved }) => toast.success(saved ? "Removed from Saved" : "Added to Saved"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["bookmarks"] }),
  });

  const ids = new Set((query.data ?? []).map((b) => b.profile_id));
  return { user, ids, query, toggle };
}
