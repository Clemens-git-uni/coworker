import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

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
  component: GuidelinesPage,
});

function GuidelinesPage() {
  const { t } = useTranslation("legal");
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h1 className="text-3xl font-bold">{t("guidelines.title")}</h1>
      <ul className="list-disc space-y-2 pl-6 text-foreground/90">
        <li>{t("guidelines.rules.experience")}</li>
        <li>{t("guidelines.rules.conduct")}</li>
        <li>{t("guidelines.rules.facts")}</li>
        <li>{t("guidelines.rules.privacy")}</li>
        <li>{t("guidelines.rules.onePerPerson")}</li>
      </ul>
      <p className="text-muted-foreground">{t("guidelines.footer")}</p>
    </div>
  );
}
