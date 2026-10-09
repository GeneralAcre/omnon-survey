"use client";

import { useState } from "react";
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
    <button
      onClick={() => setLang(lang === "en" ? "th" : "en")}
      className={`rounded-full border border-line px-3 py-1.5 text-sm text-foreground ${className}`}
    >
      {t("language")}
    </button>
  );
}

export function SignIn({ onDone }: { onDone?: () => void }) {
  const { t, L } = useT();
  const current = useUser();
  const [name, setName] = useState(current?.name ?? "");
  const [group, setGroup] = useState(current?.group ?? "");
  const ready = name.trim() && group;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-6 pb-safe">
      <div className="flex justify-end">
        <LangToggle />
      </div>
      <div className="mt-10">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">Khlong Om Non</p>
        <h1 className="mt-2 text-3xl font-bold">{t("welcome")}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{t("welcomeSub")}</p>
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
        <label className="text-sm font-medium text-muted" htmlFor="name">
          {t("yourName")}
        </label>
        <input
          id="name"
          className="field mt-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          autoFocus
          maxLength={80}
        />

        <p className="mt-6 text-sm font-medium text-muted">{t("yourGroup")}</p>
        <div className="mt-2 space-y-2">
          {GROUPS.map((g) => (
            <button
              type="button"
              key={g.id}
              onClick={() => setGroup(g.id)}
              className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${
                group === g.id ? "" : "border-line bg-surface"
              }`}
              style={group === g.id ? { background: g.color, borderColor: g.color, color: g.ink } : undefined}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold"
                style={group === g.id ? { background: "rgba(0,0,0,0.85)", color: g.color } : { background: g.color, color: g.ink }}
              >
                {g.id}
              </span>
              <span>
                <span className="block font-semibold">{L(g.label)}</span>
                <span className={`block text-sm ${group === g.id ? "opacity-75" : "text-muted"}`}>{L(g.zone)}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-auto pt-8">
          <button type="submit" className="btn-primary w-full" disabled={!ready}>
            {t("start")}
          </button>
        </div>
      </form>
    </main>
  );
}
