import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/guidelines")({
  head: () => ({
    meta: [
      { title: "Review Guidelines — CoWorker" },
      { name: "description", content: "How to write fair, honest reviews on CoWorker." },
      { property: "og:title", content: "Review Guidelines — CoWorker" },
      { property: "og:description", content: "How to write fair, honest reviews on CoWorker." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h1 className="text-3xl font-bold">Review Guidelines</h1>
      <ul className="list-disc space-y-2 pl-6 text-foreground/90">
        <li>Only review people you have actually worked with. Reviews must be based on real professional experience.</li>
        <li>No personal attacks, insults, harassment, or hateful language.</li>
        <li>Stick to facts. Do not post false or misleading information.</li>
        <li>No spam, advertising, or private information such as phone numbers or addresses.</li>
        <li>One review per person. You can edit or delete your own review at any time.</li>
      </ul>
      <p className="text-muted-foreground">Reviews that break these rules may be hidden or removed by our moderators.</p>
    </div>
  ),
});
