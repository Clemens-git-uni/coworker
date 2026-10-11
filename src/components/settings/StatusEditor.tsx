import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { STATUSES, statusLabel, type ProfileStatus } from "@/lib/profile-meta";

export function StatusEditor({ userId, initial }: {
  userId: string; initial: { status: string; status_return_date: string | null; status_note: string };
}) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<ProfileStatus>(initial.status as ProfileStatus);
  const [returnDate, setReturnDate] = useState(initial.status_return_date ?? "");
  const [note, setNote] = useState(initial.status_note);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setStatus(initial.status as ProfileStatus); setReturnDate(initial.status_return_date ?? ""); setNote(initial.status_note);
  }, [initial.status, initial.status_return_date, initial.status_note]);

  const dirty = status !== initial.status ||
    (status !== "active" && (returnDate !== (initial.status_return_date ?? "") || note.trim() !== initial.status_note.trim()));

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      status, status_return_date: status === "active" ? null : returnDate || null, status_note: status === "active" ? "" : note.trim().slice(0, 140),
    }).eq("id", userId);
    setSaving(false);
    if (error) { toast.error("Couldn't update your status."); return; }
    toast.success(`Status changed to ${statusLabel(status)}`);
    qc.invalidateQueries({ queryKey: ["profile", userId] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Availability status</CardTitle>
        <CardDescription>Let people know if you're away. Your reviews always stay visible.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={status} onValueChange={(v) => setStatus(v as ProfileStatus)} className="space-y-2">
          {STATUSES.map((s) => (
            <label key={s.value} htmlFor={`st-${s.value}`} className="flex cursor-pointer gap-3 rounded-md border p-3 has-[:checked]:border-primary">
              <RadioGroupItem value={s.value} id={`st-${s.value}`} className="mt-0.5" />
              <span><span className="block text-sm font-semibold">{s.label}</span><span className="block text-xs text-muted-foreground">{s.help}</span></span>
            </label>
          ))}
        </RadioGroup>
        {status !== "active" && (
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="ret">Return date (optional)</Label>
              <Input id="ret" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Short note (optional)</Label>
              <Input id="note" value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder="e.g. On parental leave until spring" />
            </div>
          </div>
        )}
        <div className="flex justify-end"><Button size="sm" onClick={save} disabled={saving || !dirty}>{saving ? "Saving…" : "Save status"}</Button></div>
      </CardContent>
    </Card>
  );
}
