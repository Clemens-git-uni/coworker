import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

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
  component: TermsPage,
});

function TermsPage() {
  const { t } = useTranslation("legal");
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h1 className="text-3xl font-bold">{t("terms.title")}</h1>
      <p>{t("terms.intro")}</p>
      <ul className="list-disc space-y-2 pl-6 text-foreground/90">
        <li>{t("terms.rules.content")}</li>
        <li>{t("terms.rules.genuine")}</li>
        <li>{t("terms.rules.suspension")}</li>
        <li>{t("terms.rules.limit")}</li>
      </ul>
    </div>
  );
}
