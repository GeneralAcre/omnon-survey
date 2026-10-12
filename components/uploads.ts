"use client";

// Every photo upload in the app. A photo stays on the phone (photo-queue) from the
// moment it's taken until it is part of a building on the server, so losing
// signal, leaving the form or closing the app never loses it.
//
// While its form is open a photo belongs to that form ("new" or the record id) and
// the form adds it to the building once uploaded. Saving with photos still in
// flight moves them to "saved:<record id>": each is then added to that building on
// the server as it finishes, so surveyors can save and walk on to the next one.
import { useSyncExternalStore } from "react";
import type { ImageSlotKey, Person, SurveyRecord } from "@/lib/schema";
import { prepare, uploadPrepared } from "./images";
import { queue, type QueuedPhoto } from "./photo-queue";

export type Upload = QueuedPhoto & { preview: string; status: "uploading" | "waiting" | "failed" };

const uploads = new Map<string, Upload>();
const running = new Set<string>();
const held = new Set<string>(); // "saved:<id>" contexts whose building is still being saved
const listeners = new Set<() => void>();
const attachedListeners = new Set<(r: SurveyRecord) => void>();
const EMPTY: Upload[] = [];
let snapshot: Upload[] = EMPTY;

function changed() {
  snapshot = [...uploads.values()];
  listeners.forEach((l) => l());
}

function set(id: string, patch: Partial<Upload>) {
  const u = uploads.get(id);
  if (!u) return;
  uploads.set(id, { ...u, ...patch });
  changed();
}

function persist(id: string) {
  const u = uploads.get(id);
  if (!u) return Promise.resolve();
  return queue.put({ id: u.id, context: u.context, slot: u.slot, blob: u.blob, createdAt: u.createdAt, by: u.by, file: u.file });
}

// At most 2 uploads at once so a weak 4G link isn't saturated.
let active = 0;
const turns: (() => void)[] = [];
async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= 2) await new Promise<void>((r) => turns.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    turns.shift()?.();
  }
}

async function run(id: string) {
  if (running.has(id) || !uploads.has(id)) return;
  running.add(id);
  set(id, { status: "uploading" });
  try {
    if (!uploads.get(id)!.file) {
      const file = await limited(async () => uploadPrepared(await prepare(uploads.get(id)!.blob)));
      if (!uploads.has(id)) return; // deleted meanwhile
      set(id, { file });
      await persist(id);
    }
    await attachIfSaved(id);
  } catch (e) {
    if (uploads.has(id)) set(id, { status: (e as { permanent?: boolean }).permanent ? "failed" : "waiting" });
  } finally {
    running.delete(id);
  }
}

async function attachIfSaved(id: string) {
  const u = uploads.get(id);
  if (!u?.file || !u.context.startsWith("saved:") || held.has(u.context)) return;
  const res = await fetch(`/api/records/${u.context.slice(6)}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slot: u.slot, file: u.file, at: new Date(u.createdAt).toISOString(), by: u.by }),
  });
  if (res.ok) {
    const record = (await res.json()) as SurveyRecord;
    finishUpload(id);
    attachedListeners.forEach((l) => l(record));
    return;
  }
  if (res.status === 400 || res.status === 403 || res.status === 404) {
    // The building is gone: hand the photo to the new-building form rather than lose it.
    set(id, { context: "new" });
    await persist(id);
    return;
  }
  throw new Error(`Couldn't add photo (${res.status})`); // retried later
}

function retryWaiting() {
  for (const u of snapshot) if (u.status === "waiting") run(u.id);
}

let started = false;
// Picks up photos left on the phone by an earlier visit, and keeps retrying ones waiting for signal.
export function startUploads() {
  if (started) return;
  started = true;
  queue.all().then((items) => {
    for (const q of items) {
      if (!uploads.has(q.id)) uploads.set(q.id, { ...q, preview: URL.createObjectURL(q.blob), status: "uploading" });
    }
    changed();
    items.forEach((q) => run(q.id));
  });
  window.addEventListener("online", retryWaiting);
  setInterval(retryWaiting, 20_000);
}

export async function addPhotos(context: string, slot: ImageSlotKey, files: File[], by: Person) {
  const added: Upload[] = files.map((blob) => ({
    id: crypto.randomUUID(),
    context,
    slot,
    blob,
    createdAt: Date.now(),
    by,
    preview: URL.createObjectURL(blob),
    status: "uploading",
  }));
  for (const u of added) uploads.set(u.id, u);
  changed();
  // Save to the phone first, then upload.
  await Promise.all(added.map((u) => persist(u.id)));
  added.forEach((u) => run(u.id));
}

export const retryUpload = (id: string) => run(id);

export function finishUpload(id: string) {
  const u = uploads.get(id);
  if (!u) return;
  uploads.delete(id);
  URL.revokeObjectURL(u.preview);
  queue.remove(id);
  changed();
}

export function discardContext(context: string) {
  for (const u of snapshot) if (u.context === context) finishUpload(u.id);
}

// Saving a form: its unfinished photos now belong to building `recordId`, but wait
// for release() so none is added before the building exists.
export function handOff(context: string, recordId: string): string[] {
  const to = `saved:${recordId}`;
  held.add(to);
  const ids = snapshot.filter((u) => u.context === context && u.status !== "failed").map((u) => u.id);
  for (const id of ids) {
    set(id, { context: to });
    persist(id);
  }
  return ids;
}

export function release(recordId: string) {
  const to = `saved:${recordId}`;
  held.delete(to);
  for (const u of snapshot) if (u.context === to) run(u.id);
}

// The save failed: the photos go back to the form.
export function handBack(ids: string[], context: string, recordId: string) {
  held.delete(`saved:${recordId}`);
  for (const id of ids) {
    set(id, { context });
    persist(id);
  }
}

export function onPhotoAttached(fn: (r: SurveyRecord) => void) {
  attachedListeners.add(fn);
  return () => void attachedListeners.delete(fn);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export function useUploads(): Upload[] {
  return useSyncExternalStore(subscribe, () => snapshot, () => EMPTY);
}
