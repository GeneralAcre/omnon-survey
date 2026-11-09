"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { setLang, setUser, useT, useUser } from "./app-state";
import { startUploads, useUploads } from "./uploads";

// Wraps every page; photos still uploading keep going wherever the surveyor goes.
export default function Shell({ children }: { children: React.ReactNode }) {
  const user = useUser();
  return (
    <>
      {children}
      {user && <BackgroundUploads />}
    </>
  );
}

// Gates the survey pages behind a one-time "who are you" screen.
// The landing and About stay open, e.g. for an audience during a presentation.
export function RequireUser({ children }: { children: React.ReactNode }) {
  const user = useUser();
  if (user === undefined) return <div className="flex-1" />;
  if (user === null) return <SignIn />;
  return children;
}

// Photos still uploading for buildings that were already saved, on every page.
function BackgroundUploads() {
  const { t } = useT();
  const uploads = useUploads();
  const saved = uploads.filter((u) => u.context.startsWith("saved:"));
  const waiting = saved.filter((u) => u.status === "waiting").length;
  const busy = uploads.some((u) => u.status !== "failed");

  useEffect(() => startUploads(), []);

  // Closing the page now would pause these until the app is opened again.
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  if (!saved.length) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] left-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full bg-secondary/95 px-3.5 py-2 text-xs font-semibold shadow-lg backdrop-blur"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${waiting ? "bg-brand" : "animate-pulse bg-brand"}`} />
      {(waiting ? t("waitingBg") : t("uploadingBg")).replace("{n}", String(waiting || saved.length))}
    </div>
  );
}

// Both languages always visible, so it can be found whichever one is showing.
export function LangToggle({ className = "" }: { className?: string }) {
  const { lang } = useT();
  const options = [
    { id: "en", label: "EN" },
    { id: "th", label: "ไทย" },
  ] as const;
  return (
    <div role="group" aria-label="Language / ภาษา" className={cn("flex h-9 shrink-0 items-center rounded-full border border-border bg-card p-0.5 text-xs font-semibold", className)}>
      {options.map((o) => (
        <button
          key={o.id}
          aria-pressed={lang === o.id}
          onClick={() => setLang(o.id)}
          className={cn("h-full rounded-full px-2.5 transition-colors", lang === o.id ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SignIn({ onDone }: { onDone?: () => void }) {
  const { t } = useT();
  const current = useUser();
  const [name, setName] = useState(current?.name ?? "");
  const ready = name.trim();

  return (
    // Phones: the canal photo as a card above the form. Wide screens: photo half, form half.
    <div className="flex flex-1 lg:grid lg:grid-cols-2">
    <div aria-hidden="true" className="hidden bg-[url(/omnon.jpg)] bg-cover bg-[center_60%] lg:block" />
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-safe lg:justify-center lg:py-12">
      <div className="flex justify-end lg:fixed lg:top-6 lg:right-6">
        <LangToggle />
      </div>
      <div aria-hidden="true" className="mt-4 h-44 rounded-3xl bg-[url(/omnon.jpg)] bg-cover bg-[center_60%] sm:h-56 lg:hidden" />
      <div className="mt-7 lg:mt-0">
        <h1 className="font-display text-4xl leading-none">{t("welcome")}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{t("welcomeSub")}</p>
      </div>

      <form
        className="mt-8 flex flex-1 flex-col lg:flex-none"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ready) return;
          setUser({ name: name.trim() });
          onDone?.();
        }}
      >
        <Label className="text-muted-foreground" htmlFor="name">
          {t("yourName")}
        </Label>
        <Input
          id="name"
          className="mt-2 h-13 rounded-2xl bg-card px-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          autoFocus
          maxLength={80}
        />

        <div className="mt-auto pt-8">
          <Button type="submit" size="xl" className="w-full" disabled={!ready}>
            {t("start")}
          </Button>
        </div>
      </form>
    </main>
    </div>
  );
}
