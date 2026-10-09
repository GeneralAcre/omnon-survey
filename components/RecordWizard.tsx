"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BUILDING_TYPES,
  FUNCTIONS,
  GROUPS,
  IMAGE_SLOTS,
  allPhotos,
  coordsFromLink,
  emptyInput,
  functionLabel,
  groupOf,
  mapsLink,
  shotsDone,
  typeLabel,
  type ImageSlotKey,
  type Label,
  type SurveyInput,
  type SurveyRecord,
} from "@/lib/schema";
import { useT, useUser } from "./app-state";
import { saveRecord, useRecords } from "./data";
import { photoUrl, prepare, uploadPrepared } from "./images";
import { queue } from "./photo-queue";
import { IconAlert, IconBack, IconCamera, IconCheck, IconImage, IconNext, IconPalette, IconPin, IconPlus, IconX } from "./Icons";
import ColorSampler from "./ColorSampler";

const STEPS = ["stepPlot", "stepType", "stepFunction", "stepPhotos", "stepColors", "stepReview"] as const;

type Pending = {
  id: string;
  slot: ImageSlotKey;
  preview: string;
  status: "uploading" | "waiting" | "failed";
  blob: Blob;
};

// At most 2 uploads at once so a weak 4G link isn't saturated.
let active = 0;
const waiting: (() => void)[] = [];
async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= 2) await new Promise<void>((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

function fromRecord(record: SurveyRecord): SurveyInput {
  const base = emptyInput(record.group);
  const keys = Object.keys(base) as (keyof SurveyInput)[];
  const out = Object.fromEntries(keys.map((k) => [k, record[k] ?? base[k]])) as SurveyInput;
  return { ...out, images: { ...base.images, ...record.images } };
}

export default function RecordWizard({ record }: { record?: SurveyRecord }) {
  const { t, L, lang } = useT();
  const user = useUser()!;
  const router = useRouter();
  const { records, reload } = useRecords();
  const context = record?.id ?? "new";
  const draftKey = record ? `omnon.draft.${record.id}` : "omnon.draft";
  const initial = () => (record ? fromRecord(record) : emptyInput(user.group));

  const [data, setData] = useState<SurveyInput>(initial);
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState<Pending[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const [justSaved, setJustSaved] = useState<{ id: string; plotNo: string; photos: number } | null>(null);
  const [sampling, setSampling] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const dirty = useRef(false);
  const stepRef = useRef(0);
  const restored = useRef(false);
  const target = useRef<ImageSlotKey>("front");
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  function persist(next: SurveyInput) {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ data: next, step: stepRef.current }));
    } catch {}
  }

  function clearDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
  }

  useEffect(() => {
    stepRef.current = step;
    if (dirty.current) persist(data);
    scroller.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.length) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending.length]);

  const waitingCount = pending.filter((p) => p.status === "waiting").length;

  function update(patch: Partial<SurveyInput>) {
    dirty.current = true;
    setData((d) => {
      const next = { ...d, ...patch };
      persist(next);
      return next;
    });
  }

  function updateSlot(key: ImageSlotKey, fn: (s: SurveyInput["images"][ImageSlotKey]) => SurveyInput["images"][ImageSlotKey]) {
    dirty.current = true;
    setData((d) => {
      const next = { ...d, images: { ...d.images, [key]: fn(d.images[key]) } };
      persist(next);
      return next;
    });
  }

  async function upload(p: Pending) {
    setPending((list) => list.map((x) => (x.id === p.id ? { ...x, status: "uploading" } : x)));
    try {
      const name = await limited(async () => uploadPrepared(await prepare(p.blob)));
      // Draft is written inside updateSlot before the local copy is dropped,
      // so a crash in between can only duplicate a photo, never lose it.
      updateSlot(p.slot, (s) =>
        s.photos.some((x) => x.file === name)
          ? s
          : { ...s, photos: [...s.photos, { file: name, by: user.name, group: user.group, at: new Date().toISOString() }] },
      );
      await queue.remove(p.id);
      URL.revokeObjectURL(p.preview);
      setPending((list) => list.filter((x) => x.id !== p.id));
    } catch (e) {
      const status = (e as { permanent?: boolean }).permanent ? "failed" : "waiting";
      setPending((list) => list.map((x) => (x.id === p.id ? { ...x, status } : x)));
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    dirty.current = true;
    persist(data);
    const slot = target.current;
    const items: Pending[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      slot,
      blob: file,
      preview: URL.createObjectURL(file),
      status: "uploading",
    }));
    setPending((list) => [...list, ...items]);
    // Save to the phone first, then upload.
    await Promise.all(items.map((p) => queue.put({ id: p.id, context, slot, blob: p.blob, createdAt: Date.now() })));
    items.forEach(upload);
  }

  // Restore an unsaved draft and any photos still waiting on this phone.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as { data: SurveyInput; step: number };
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setData({ ...initial(), ...draft.data });
        setStep(Math.min(draft.step ?? 0, STEPS.length - 1));
        setDraftRestored(true);
        dirty.current = true;
      }
    } catch {}
    queue.list(context).then((items) => {
      if (!items.length) return;
      dirty.current = true;
      const restoredItems: Pending[] = items.map((q) => ({
        id: q.id,
        slot: q.slot,
        blob: q.blob,
        preview: URL.createObjectURL(q.blob),
        status: "uploading",
      }));
      setPending((list) => [...list, ...restoredItems]);
      restoredItems.forEach(upload);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Photos waiting for signal: retry when the phone comes back online, and every 20 s.
  useEffect(() => {
    if (!waitingCount) return;
    const retryAll = () => pending.filter((p) => p.status === "waiting").forEach(upload);
    window.addEventListener("online", retryAll);
    const timer = setInterval(retryAll, 20000);
    return () => {
      window.removeEventListener("online", retryAll);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingCount]);

  function discardPending(p: Pending) {
    URL.revokeObjectURL(p.preview);
    queue.remove(p.id);
    setPending((list) => list.filter((x) => x.id !== p.id));
  }

  function openPicker(slot: ImageSlotKey, camera: boolean) {
    target.current = slot;
    (camera ? cameraInput : galleryInput).current?.click();
  }

  function resetLocal() {
    clearDraft();
    queue.clear(context);
    pending.forEach((p) => URL.revokeObjectURL(p.preview));
    setPending([]);
    dirty.current = false;
  }

  function leave() {
    if ((dirty.current || pending.length) && !confirm(t("discard"))) return;
    resetLocal();
    router.push(record ? `/r/${record.id}` : "/");
  }

  function startOver() {
    resetLocal();
    setData(initial());
    setStep(0);
    setDraftRestored(false);
  }

  function useMyLocation() {
    setLocError("");
    if (!("geolocation" in navigator) || !window.isSecureContext) {
      setLocError(t("locationNeedsHttps"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 1e6) / 1e6;
        const lng = Math.round(pos.coords.longitude * 1e6) / 1e6;
        update({ lat, lng, mapLink: mapsLink(lat, lng) });
        setLocating(false);
      },
      () => {
        setLocError(t("locationFailed"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 },
    );
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const saved = await saveRecord(data, user, record?.id, record ? allPhotos(record).map((p) => p.file) : undefined);
      clearDraft();
      dirty.current = false;
      if (record) {
        router.replace(`/r/${saved.id}`);
        return;
      }
      // Straight back to a fresh form for the next building.
      setJustSaved({ id: saved.id, plotNo: saved.plotNo, photos: allPhotos(saved).length });
      setData(emptyInput(data.group));
      setDraftRestored(false);
      setStep(0);
      setSaving(false);
      reload();
    } catch (e) {
      setError(navigator.onLine === false || e instanceof TypeError ? t("noSignal") : (e as Error).message);
      setSaving(false);
    }
  }

  const uploading = pending.filter((p) => p.status === "uploading").length;
  const duplicate =
    data.plotNo.trim() &&
    records?.find(
      (r) => r.id !== record?.id && r.group === data.group && r.plotNo.trim().toLowerCase() === data.plotNo.trim().toLowerCase(),
    );
  const canNext = step !== 0 || (data.plotNo.trim() && data.group);
  const isLast = step === STEPS.length - 1;
  const optionalStep = step === 1 || step === 2;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      {/* Top bar */}
      <header className="border-b border-line px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button onClick={leave} aria-label={t("close")} className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full active:bg-surface-2">
            <IconX />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">
              {step + 1}/{STEPS.length} · {record ? `${t("edit")} ${record.plotNo}` : t("newRecord")}
            </p>
            <h1 className="truncate text-lg font-bold">{t(STEPS[step])}</h1>
          </div>
          {pending.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">
              <span className={`h-2 w-2 rounded-full ${waitingCount ? "bg-yellow-400" : "animate-pulse bg-accent"}`} />
              {pending.length}
            </span>
          )}
        </div>
        <div className="mx-auto mt-3 flex max-w-2xl gap-1">
          {STEPS.map((s, i) => (
            <button
              key={s}
              aria-label={t(s)}
              onClick={() => data.plotNo.trim() && data.group && setStep(i)}
              className={`h-1 flex-1 rounded-full transition ${i <= step ? "bg-foreground" : "bg-line"}`}
            />
          ))}
        </div>
      </header>

      {/* Body */}
      <div ref={scroller} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-5">
          {justSaved && step === 0 && (
            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-ok/15 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ok text-background">
                <IconCheck />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ok">
                  {t("saved")} · {justSaved.plotNo}
                </p>
                <p className="text-sm text-muted">
                  {justSaved.photos} {t("photos")} · {t("nextBuilding")}
                </p>
              </div>
              <Link href={`/r/${justSaved.id}`} className="shrink-0 text-sm font-semibold underline">
                {t("viewIt")}
              </Link>
            </div>
          )}
          {draftRestored && step === 0 && (
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 text-sm">
              <span>{t("draftRestored")}</span>
              <button onClick={startOver} className="font-semibold text-accent">
                {t("discardDraft")}
              </button>
            </div>
          )}

          {step === 0 && (
            <div className="space-y-7">
              <div>
                <label htmlFor="plot" className="text-sm font-medium text-muted">
                  {t("plotNo")}
                </label>
                <input
                  id="plot"
                  value={data.plotNo}
                  onChange={(e) => update({ plotNo: e.target.value })}
                  placeholder="A-12"
                  autoComplete="off"
                  autoCapitalize="characters"
                  enterKeyHint="next"
                  onKeyDown={(e) => e.key === "Enter" && canNext && setStep(1)}
                  className="field mt-2 py-5 text-3xl font-bold tracking-wide"
                />
                <p className="mt-2 text-sm text-muted">{t("plotHint")}</p>
                {duplicate && (
                  <div className="mt-3 flex items-start gap-2 rounded-2xl bg-accent/10 p-3 text-sm text-accent">
                    <IconAlert className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>
                      {t("duplicate")}{" "}
                      <Link href={`/r/${duplicate.id}`} className="font-semibold underline">
                        {t("openExisting")}
                      </Link>
                    </span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-muted">{t("location")}</p>
                <button
                  onClick={useMyLocation}
                  disabled={locating}
                  className="mt-2 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-surface-2 font-semibold active:scale-[0.99] disabled:opacity-60"
                >
                  <IconPin />
                  {locating ? t("locating") : t("useMyLocation")}
                </button>
                <input
                  value={data.mapLink}
                  onChange={(e) => {
                    const v = e.target.value;
                    const c = coordsFromLink(v);
                    update({ mapLink: v, lat: c?.lat ?? null, lng: c?.lng ?? null });
                  }}
                  placeholder={t("pasteMapLink")}
                  inputMode="url"
                  autoComplete="off"
                  className="field mt-2 text-sm"
                />
                {locError && <p className="mt-2 text-sm text-accent">{locError}</p>}
                <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                  {data.mapLink ? (
                    <>
                      <span className="truncate text-muted">
                        {data.lat !== null ? `${data.lat}, ${data.lng}` : t("linkSaved")}
                      </span>
                      <a
                        href={/^https?:\/\//i.test(data.mapLink) ? data.mapLink : data.lat !== null ? mapsLink(data.lat, data.lng!) : "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 font-semibold text-accent"
                      >
                        {t("openMaps")} ↗
                      </a>
                    </>
                  ) : (
                    <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="text-muted underline">
                      {t("findOnMaps")}
                    </a>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted">{t("group")}</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {GROUPS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => update({ group: g.id })}
                      className={`rounded-2xl border-2 p-3 text-left transition ${data.group === g.id ? "" : "border-line bg-surface"}`}
                      style={data.group === g.id ? { background: g.color, borderColor: g.color, color: g.ink } : { borderTopColor: g.color }}
                    >
                      <span className="block text-lg font-bold">{g.id}</span>
                      <span className={`block text-xs leading-snug ${data.group === g.id ? "opacity-75" : "text-muted"}`}>{L(g.zone)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <Choices
              options={BUILDING_TYPES}
              value={data.buildingType}
              other={data.buildingTypeOther}
              onPick={(id) => {
                update({ buildingType: id });
                if (id !== "other") setStep(2);
              }}
              onOther={(v) => update({ buildingTypeOther: v })}
            />
          )}

          {step === 2 && (
            <Choices
              options={FUNCTIONS}
              value={data.function}
              other={data.functionOther}
              onPick={(id) => {
                update({ function: id });
                if (id !== "other") setStep(3);
              }}
              onOther={(v) => update({ functionOther: v })}
            />
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                {shotsDone(data)}/{IMAGE_SLOTS.length} {t("shots")} · {t("multiHint")}
              </p>
              {IMAGE_SLOTS.map((s, i) => (
                <ShotCard
                  key={s.key}
                  index={i + 1}
                  label={s.label}
                  hint={s.hint}
                  slot={data.images[s.key]}
                  pending={pending.filter((p) => p.slot === s.key)}
                  onCamera={() => openPicker(s.key, true)}
                  onGallery={() => openPicker(s.key, false)}
                  onRemove={(file) => updateSlot(s.key, (x) => ({ ...x, photos: x.photos.filter((p) => p.file !== file) }))}
                  onRetry={upload}
                  onDiscard={discardPending}
                  onNote={(note) => updateSlot(s.key, (x) => ({ ...x, note }))}
                />
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-7">
              <section>
                <h2 className="flex items-center gap-2 font-semibold">
                  <IconPalette /> {L(IMAGE_SLOTS[7].label)}
                </h2>
                {allPhotos(data).length > 0 ? (
                  <>
                    <p className="mt-1 text-sm text-muted">{t("pickFromPhoto")}</p>
                    <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
                      {[...data.images.colorScheme.photos, ...allPhotos(data).filter((p) => p.slot !== "colorScheme")].map((p) => (
                        <button key={p.file} onClick={() => setSampling(p.file)} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photoUrl(p.file, "thumb")} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted">{t("colorsNoPhoto")}</p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {data.colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => update({ colors: data.colors.filter((x) => x !== c) })}
                      className="group relative h-12 w-12 rounded-xl border border-white/10"
                      style={{ background: c }}
                      aria-label={`Remove ${c}`}
                    >
                      <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface-2 text-foreground">
                        <IconX className="h-3 w-3" />
                      </span>
                    </button>
                  ))}
                  <label className="flex h-12 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-3 text-sm text-muted">
                    <input
                      type="color"
                      className="h-0 w-0 opacity-0"
                      onChange={(e) => !data.colors.includes(e.target.value) && update({ colors: [...data.colors, e.target.value].slice(0, 12) })}
                    />
                    + {t("addSwatch")}
                  </label>
                </div>
              </section>
              <section>
                <label htmlFor="notes" className="font-semibold">
                  {t("notes")}
                </label>
                <textarea
                  id="notes"
                  value={data.notes}
                  onChange={(e) => update({ notes: e.target.value })}
                  placeholder={t("notesHint")}
                  rows={5}
                  className="field mt-2"
                />
              </section>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-2">
              <ReviewRow label={t("plotNo")} value={`${data.plotNo} · ${L(groupOf(data.group)!.label)}`} onEdit={() => setStep(0)} />
              <ReviewRow label={t("stepType")} value={typeLabel(data, lang)} onEdit={() => setStep(1)} empty={t("notSet")} />
              <ReviewRow label={t("stepFunction")} value={functionLabel(data, lang)} onEdit={() => setStep(2)} empty={t("notSet")} />
              <button onClick={() => setStep(3)} className="w-full rounded-2xl bg-surface p-4 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">{t("stepPhotos")}</span>
                  <span className="text-sm font-semibold">
                    {shotsDone(data)}/{IMAGE_SLOTS.length}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {IMAGE_SLOTS.map((s) => {
                    const p = data.images[s.key].photos[0];
                    return (
                      <div key={s.key} className="relative aspect-square overflow-hidden rounded-lg bg-surface-2">
                        {p ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photoUrl(p.file, "thumb")} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center px-1 text-center text-[10px] text-muted">
                            {L(s.label)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </button>
              <button onClick={() => setStep(4)} className="w-full rounded-2xl bg-surface p-4 text-left">
                <span className="text-sm text-muted">{t("stepColors")}</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.colors.map((c) => (
                    <span key={c} className="h-6 w-6 rounded-md" style={{ background: c }} />
                  ))}
                </div>
                {data.notes && <p className="mt-2 line-clamp-3 text-sm whitespace-pre-line">{data.notes}</p>}
              </button>
              <p className="pt-2 text-center text-xs text-muted">
                {t("filledBy")} {user.name} · {L(groupOf(user.group)!.label)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <footer className="border-t border-line bg-background px-4 pt-3 pb-safe">
        <div className="mx-auto max-w-2xl">
          {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
          {pending.some((p) => p.status === "failed") && <p className="mb-2 text-sm text-red-400">{t("badPhotoFooter")}</p>}
          {waitingCount > 0 && (
            <p className="mb-2 text-sm text-yellow-300">
              {waitingCount} {t("photosWaiting")}
            </p>
          )}
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="btn-secondary w-14 px-0" aria-label={t("back")}>
                <IconBack />
              </button>
            )}
            {isLast ? (
              <button onClick={save} disabled={saving || pending.length > 0} className="btn-primary flex-1">
                {saving ? t("saving") : uploading > 0 ? t("waitUploads") : waitingCount > 0 ? t("waitSignal") : t("save")}
              </button>
            ) : (
              <button onClick={() => setStep(step + 1)} disabled={!canNext} className="btn-primary flex-1">
                {optionalStep && !(step === 1 ? data.buildingType : data.function) ? t("skip") : t("next")}
                <IconNext />
              </button>
            )}
          </div>
        </div>
      </footer>

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      <input ref={galleryInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />

      {sampling && (
        <ColorSampler
          src={photoUrl(sampling)}
          onPick={(c) => setData((d) => (d.colors.includes(c) ? d : { ...d, colors: [...d.colors, c].slice(0, 12) }))}
          onClose={() => setSampling(null)}
        />
      )}
    </div>
  );
}

function Choices({
  options,
  value,
  other,
  onPick,
  onOther,
}: {
  options: { id: string; label: Label }[];
  value: string;
  other: string;
  onPick: (id: string) => void;
  onOther: (v: string) => void;
}) {
  const { t, L } = useT();
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onPick(o.id)}
            className={`flex min-h-20 items-end rounded-2xl border p-3.5 text-left text-[15px] leading-snug font-medium transition active:scale-[0.98] ${
              value === o.id ? "border-foreground bg-foreground text-background" : "border-line bg-surface"
            }`}
          >
            {L(o.label)}
          </button>
        ))}
      </div>
      {value === "other" && (
        <input autoFocus className="field mt-3" placeholder={t("describe")} value={other} onChange={(e) => onOther(e.target.value)} />
      )}
    </div>
  );
}

function ShotCard({
  index,
  label,
  hint,
  slot,
  pending,
  onCamera,
  onGallery,
  onRemove,
  onRetry,
  onDiscard,
  onNote,
}: {
  index: number;
  label: Label;
  hint: Label;
  slot: SurveyInput["images"][ImageSlotKey];
  pending: Pending[];
  onCamera: () => void;
  onGallery: () => void;
  onRemove: (file: string) => void;
  onRetry: (p: Pending) => void;
  onDiscard: (p: Pending) => void;
  onNote: (note: string) => void;
}) {
  const { t, L } = useT();
  const [showNote, setShowNote] = useState(!!slot.note);
  const has = slot.photos.length > 0;
  const empty = !has && pending.length === 0;

  return (
    <div className={`rounded-2xl border p-3 transition ${has ? "border-ok/30 bg-surface" : "border-line bg-surface"}`}>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            has ? "bg-ok text-background" : "bg-surface-2 text-muted"
          }`}
        >
          {has ? <IconCheck className="h-4 w-4" /> : index}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{L(label)}</p>
          <p className="truncate text-xs text-muted">{L(hint)}</p>
        </div>
        {has && (
          <span className="shrink-0 rounded-full bg-ok/15 px-2.5 py-1 text-xs font-semibold text-ok">
            {slot.photos.length} {t("photos")}
          </span>
        )}
      </div>

      {empty ? (
        <div className="mt-3 flex gap-2">
          <button onClick={onCamera} className="flex h-24 flex-1 flex-col items-center justify-center gap-1 rounded-xl bg-surface-2 text-sm font-medium active:scale-[0.98]">
            <IconCamera className="h-7 w-7" />
            {t("takePhoto")}
          </button>
          <button onClick={onGallery} className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border border-line text-xs text-muted active:scale-[0.98]">
            <IconImage className="h-6 w-6" />
            {t("gallery")}
          </button>
        </div>
      ) : (
        <div className="no-scrollbar -mx-3 mt-3 flex gap-2 overflow-x-auto px-3">
          {slot.photos.map((p) => (
            <div key={p.file} className="relative h-24 w-24 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(p.file, "thumb")} alt="" className="h-full w-full rounded-xl object-cover" />
              <button
                onClick={() => onRemove(p.file)}
                aria-label="Remove"
                className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/70"
              >
                <IconX className="h-4 w-4" />
              </button>
              <span className="absolute inset-x-1 bottom-1 truncate rounded-md bg-black/60 px-1.5 py-0.5 text-[10px]">{p.by}</span>
            </div>
          ))}
          {pending.map((p) => (
            <div key={p.id} className="relative h-24 w-24 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" className="h-full w-full rounded-xl object-cover opacity-40" />
              {p.status === "uploading" ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </span>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl bg-black/55 p-1 text-center">
                  {p.status === "failed" ? (
                    <span className="text-[10px] leading-tight text-red-300">{t("badPhoto")}</span>
                  ) : (
                    <>
                      <span className="text-[10px] leading-tight text-yellow-300">{t("onPhone")}</span>
                      <button onClick={() => onRetry(p)} className="text-[11px] font-semibold">
                        {t("retry")}
                      </button>
                    </>
                  )}
                  <button onClick={() => { if (confirm(t("confirmDiscardPhoto"))) onDiscard(p); }} className="text-[10px] text-muted underline">
                    {t("delete")}
                  </button>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={onCamera}
            className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl bg-surface-2 text-xs font-semibold active:scale-[0.98]"
          >
            <span className="relative">
              <IconCamera className="h-7 w-7" />
              <IconPlus className="absolute -top-1.5 -right-2.5 h-4 w-4 rounded-full bg-foreground p-0.5 text-background" />
            </span>
            {t("takeAnother")}
          </button>
          <button
            onClick={onGallery}
            className="flex h-24 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-xs text-muted active:scale-[0.98]"
          >
            <IconImage />
            {t("gallery")}
          </button>
        </div>
      )}

      {showNote ? (
        <input className="field mt-3 py-2.5 text-sm" placeholder={t("noteOptional")} value={slot.note} onChange={(e) => onNote(e.target.value)} />
      ) : (
        <button onClick={() => setShowNote(true)} className="mt-2 text-xs text-muted">
          + {t("noteOptional")}
        </button>
      )}
    </div>
  );
}

function ReviewRow({ label, value, onEdit, empty }: { label: string; value: string; onEdit: () => void; empty?: string }) {
  return (
    <button onClick={onEdit} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface p-4 text-left">
      <span className="min-w-0">
        <span className="block text-sm text-muted">{label}</span>
        <span className={`block truncate font-semibold ${value ? "" : "text-accent"}`}>{value || empty}</span>
      </span>
      <IconNext className="h-5 w-5 shrink-0 text-muted" />
    </button>
  );
}
