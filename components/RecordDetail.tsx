"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { groupOf } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useT, useUser } from "./app-state";
import { removeRecord, useRecord } from "./data";
import { IconBack, IconTrash } from "./Icons";
import BuildingDetail from "./BuildingDetail";
import ConfirmDialog from "./ConfirmDialog";
import { LangToggle } from "./Shell";
import { GroupBadge } from "./GroupBadge";

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, L } = useT();
  const user = useUser()!;
  const router = useRouter();
  const { record, error, reload } = useRecord(id);
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (record === undefined) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        {error ? (
          <>
            {t("loadError")}
            <Button variant="secondary" size="xl" onClick={reload}>
              {t("retry")}
            </Button>
          </>
        ) : (
          t("loading")
        )}
      </main>
    );
  }
  if (record === null) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center text-muted-foreground">
        {t("notFound")}
        <Link href="/survey" className={buttonVariants({ variant: "secondary", size: "xl" })}>
          {t("backToList")}
        </Link>
      </main>
    );
  }

  const g = groupOf(record.group)!;
  // Option B: only the building's own group can edit or delete it.
  const canEdit = record.group === user.group;

  async function del() {
    setDeleting(true);
    try {
      await removeRecord(record!.id, user);
      router.replace("/survey");
    } catch (e) {
      toast.error((e as Error).message);
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 pb-32 lg:max-w-[96rem]">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-background/85 px-2 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2 backdrop-blur-xl sm:px-4 lg:px-6">
        <Link href="/survey" aria-label={t("backToList")} className={buttonVariants({ variant: "ghost", size: "icon-xl" })}>
          <IconBack />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 truncate text-lg font-bold">{record.plotNo} <GroupBadge group={record.group} /></h1>
          <p className="truncate text-xs text-muted-foreground">
            {L(g.label)} · {L(g.zone)}
          </p>
        </div>
        <LangToggle className="mr-2" />
      </header>

      <BuildingDetail record={record}>
        {canEdit && (
          <Button variant="destructive" size="xl" onClick={() => setConfirming(true)} disabled={deleting} className="w-full">
            <IconTrash /> {t("delete")}
          </Button>
        )}
      </BuildingDetail>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-background via-background to-transparent px-4 pt-6 pb-safe">
        <div className="mx-auto max-w-2xl">
          {canEdit ? (
            <Link href={`/r/${record.id}/edit`} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
              {t("edit")}
            </Link>
          ) : (
            <div className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-secondary px-4 text-center text-sm text-muted-foreground">
              <GroupBadge group={record.group} />
              {t("viewOnly").replace("{n}", record.group)}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog open={confirming} onOpenChange={setConfirming} title={t("confirmDelete")} confirmLabel={t("delete")} onConfirm={del} />
    </main>
  );
}
