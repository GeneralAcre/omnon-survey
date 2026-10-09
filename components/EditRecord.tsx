"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useT } from "./app-state";
import { useRecord } from "./data";
import RecordWizard from "./RecordWizard";

export default function EditRecord() {
  const { id } = useParams<{ id: string }>();
  const { t } = useT();
  const { record } = useRecord(id);
  if (record === undefined) return <main className="flex flex-1 items-center justify-center text-muted">{t("loading")}</main>;
  if (record === null)
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 text-muted">
        {t("notFound")}
        <Link href="/" className="btn-secondary">
          {t("backToList")}
        </Link>
      </main>
    );
  return <RecordWizard key={record.id} record={record} />;
}
