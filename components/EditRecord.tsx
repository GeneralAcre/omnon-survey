"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { useT, useUser } from "./app-state";
import { useRecord } from "./data";
import { GroupBadge } from "./GroupBadge";
import RecordWizard from "./RecordWizard";

export default function EditRecord() {
  const { id } = useParams<{ id: string }>();
  const { t } = useT();
  const user = useUser()!;
  const { record } = useRecord(id);
  if (record === undefined) return <main className="flex flex-1 items-center justify-center text-muted-foreground">{t("loading")}</main>;
  if (record === null)
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
        {t("notFound")}
        <Link href="/" className={buttonVariants({ variant: "secondary", size: "xl" })}>
          {t("backToList")}
        </Link>
      </main>
    );
  // Other groups' buildings are view-only (the server enforces this too).
  if (record.group !== user.group)
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center text-muted-foreground">
        <GroupBadge group={record.group} className="text-sm" />
        {t("viewOnly").replace("{n}", record.group)}
        <Link href={`/r/${record.id}`} className={buttonVariants({ variant: "secondary", size: "xl" })}>
          {t("back")}
        </Link>
      </main>
    );
  return <RecordWizard key={record.id} record={record} />;
}
