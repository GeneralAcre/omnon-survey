"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { GROUPS } from "@/lib/schema";
import { setLang, setUser, useT, useUser } from "./app-state";

// Gates the app behind a one-time "who are you" screen.
export default function Shell({ children }: { children: React.ReactNode }) {
  const user = useUser();
  if (user === undefined) return <div className="flex-1" />;
  if (user === null) return <SignIn />;
  return <>{children}</>;
}

export function LangToggle({ className = "" }: { className?: string }) {
  const { t, lang } = useT();
  return (
    <Button variant="outline" onClick={() => setLang(lang === "en" ? "th" : "en")} className={cn("h-9 rounded-full px-3", className)}>
      {t("language")}
    </Button>
  );
}

export function SignIn({ onDone }: { onDone?: () => void }) {
  const { t, L } = useT();
  const current = useUser();
  const [name, setName] = useState(current?.name ?? "");
  const [group, setGroup] = useState(current?.group ?? "");
  const ready = name.trim() && group;

  return (
    <main className="relative isolate mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-safe">
      {/* The canal photo behind the welcome text, fading to black behind the form. */}
      <div aria-hidden="true" className="fixed inset-0 -z-20 bg-[url(/omnon.jpg)] bg-cover bg-[center_60%]" />
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-gradient-to-b from-black/20 via-black/70 to-background to-75%" />
      <div className="flex justify-end">
        <LangToggle className="border-white/40 bg-black/30 backdrop-blur-sm" />
      </div>
      <div className="mt-24">
        <p className="text-sm font-semibold tracking-[0.2em] text-white/85 uppercase drop-shadow">Khlong Om Non</p>
        <h1 className="mt-2 text-4xl font-bold text-white drop-shadow-lg">{t("welcome")}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-white/85 drop-shadow">{t("welcomeSub")}</p>
      </div>

      <form
        className="mt-8 flex flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ready) return;
          setUser({ name: name.trim(), group });
          onDone?.();
        }}
      >
        <Label className="text-muted-foreground" htmlFor="name">
          {t("yourName")}
        </Label>
        <Input
          id="name"
          className="mt-2 h-13 rounded-2xl bg-black/50 px-4 backdrop-blur-sm dark:bg-black/50"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          autoFocus
          maxLength={80}
        />

        <p className="mt-6 text-sm font-medium text-muted-foreground">{t("yourGroup")}</p>
        <ToggleGroup
          aria-label={t("yourGroup")}
          orientation="vertical"
          value={group ? [group] : []}
          onValueChange={(v) => setGroup(v[0] ?? "")}
          className="mt-2 w-full"
        >
          {GROUPS.map((g) => (
            <ToggleGroupItem
              key={g.id}
              value={g.id}
              className={cn(
                "h-auto w-full justify-start gap-4 rounded-2xl border-2 p-4 text-left text-base",
                group === g.id ? "" : "border-border bg-card",
              )}
              style={group === g.id ? { background: g.color, borderColor: g.color, color: g.ink } : undefined}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold"
                style={group === g.id ? { background: "rgba(0,0,0,0.85)", color: g.color } : { background: g.color, color: g.ink }}
              >
                {g.id}
              </span>
              <span className="font-semibold whitespace-normal">{L(g.label)}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="mt-auto pt-8">
          <Button type="submit" size="xl" className="w-full" disabled={!ready}>
            {t("start")}
          </Button>
        </div>
      </form>
    </main>
  );
}
