import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — CoWorker" },
      { name: "description", content: "The terms that apply when you use CoWorker." },
      { property: "og:title", content: "Terms of Use — CoWorker" },
      { property: "og:description", content: "The terms that apply when you use CoWorker." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h1 className="text-3xl font-bold">Terms of Use</h1>
      <p>By using CoWorker you agree to these terms.</p>
      <ul className="list-disc space-y-2 pl-6 text-foreground/90">
        <li>You are responsible for the content you post and must follow the Review Guidelines.</li>
        <li>Reviews must reflect your genuine professional experience.</li>
        <li>We may hide or remove content and suspend accounts that break these terms.</li>
        <li>You may post up to 5 reviews per day.</li>
      </ul>
    </div>
  ),
});
