"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Person, SurveyInput, SurveyRecord } from "@/lib/schema";

// Keep the last list in memory so going back to the list is instant.
let cache: SurveyRecord[] | null = null;

const POLL_MS = 20_000;
const sortByUpdated = (list: SurveyRecord[]) => [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
const latest = (list: SurveyRecord[]) => list.reduce((m, r) => (r.updatedAt > m ? r.updatedAt : m), "1970-01-01T00:00:00.000Z");

// `live`: while the page is visible, fetch only what changed every 20 s and
// report brand-new records via `onArrive` (for the "just added" popup).
export function useRecords({ live = false, onArrive }: { live?: boolean; onArrive?: (fresh: SurveyRecord[]) => void } = {}) {
  const [records, setRecords] = useState<SurveyRecord[] | null>(cache);
  const [error, setError] = useState(false);
  const since = useRef(cache ? latest(cache) : "");
  const arrive = useRef(onArrive);
  useEffect(() => {
    arrive.current = onArrive;
  });

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/records", { cache: "no-store" });
      if (!res.ok) throw new Error();
      cache = await res.json();
      since.current = latest(cache!);
      setRecords(cache);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  const poll = useCallback(async () => {
    if (!cache || !since.current) return reload();
    try {
      const res = await fetch(`/api/records?since=${encodeURIComponent(since.current)}`, { cache: "no-store" });
      if (!res.ok) return;
      const { records: changed, count } = (await res.json()) as { records: SurveyRecord[]; count: number };
      const known = new Set(cache.map((r) => r.id));
      const byId = new Map(cache.map((r) => [r.id, r]));
      for (const r of changed) byId.set(r.id, r);
      const merged = sortByUpdated([...byId.values()]);
      // Someone deleted a building: counts no longer match, so fetch everything.
      if (merged.length !== count) return reload();
      if (changed.length) {
        cache = merged;
        since.current = latest(merged);
        setRecords(merged);
        const fresh = changed.filter((r) => !known.has(r.id));
        if (fresh.length) arrive.current?.(fresh);
      }
      setError(false);
    } catch {
      // Offline — try again next tick.
    }
  }, [reload]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    const onVisible = () => document.visibilityState === "visible" && (live ? poll() : reload());
    document.addEventListener("visibilitychange", onVisible);
    const timer = live ? setInterval(() => document.visibilityState === "visible" && poll(), POLL_MS) : undefined;
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [reload, poll, live]);

  return { records, error, reload };
}

export function useRecord(id: string) {
  const [record, setRecord] = useState<SurveyRecord | null | undefined>(() => cache?.find((r) => r.id === id));
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch(`/api/records/${id}`, { cache: "no-store" });
      if (res.status === 404) return setRecord(null);
      if (!res.ok) throw new Error();
      setRecord(await res.json());
      setError(false);
    } catch {
      setError(true);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return { record, error, reload };
}

export async function saveRecord(record: SurveyInput, by: Person, id?: string, baseFiles?: string[]): Promise<SurveyRecord> {
  const res = await fetch(id ? `/api/records/${id}` : "/api/records", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record, by, baseFiles }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Save failed");
  cache = null;
  return json;
}

export async function removeRecord(id: string) {
  const res = await fetch(`/api/records/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
  cache = cache?.filter((r) => r.id !== id) ?? null;
}
