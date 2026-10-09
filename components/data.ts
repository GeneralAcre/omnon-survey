"use client";

import { useCallback, useEffect, useState } from "react";
import type { Person, SurveyInput, SurveyRecord } from "@/lib/schema";

// Keep the last list in memory so going back to the list is instant.
let cache: SurveyRecord[] | null = null;

export function useRecords() {
  const [records, setRecords] = useState<SurveyRecord[] | null>(cache);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/records", { cache: "no-store" });
      if (!res.ok) throw new Error();
      cache = await res.json();
      setRecords(cache);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    const onVisible = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

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

export async function saveRecord(record: SurveyInput, by: Person, id?: string): Promise<SurveyRecord> {
  const res = await fetch(id ? `/api/records/${id}` : "/api/records", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record, by }),
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
