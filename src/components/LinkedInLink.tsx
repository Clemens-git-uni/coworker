import { Linkedin } from "lucide-react";
import { cn } from "@/lib/utils";

export function LinkedInLink({ url, label = false, className }: { url?: string | null; label?: boolean; className?: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label="View on LinkedIn"
      className={cn("relative z-10 inline-flex items-center gap-1 text-primary hover:underline", className)}>
      <Linkedin className="size-4" />{label && <span>View on LinkedIn</span>}
    </a>
  );
}
