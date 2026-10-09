"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BUILDING_TYPES,
  FUNCTIONS,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as FieldLabel } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useT, useUser } from "./app-state";
import ConfirmDialog from "./ConfirmDialog";
import { saveRecord, useRecords } from "./data";
import { photoUrl, pixelUrl, prepare, uploadPrepared } from "./images";
import { queue } from "./photo-queue";
import { IconAlert, IconBack, IconCamera, IconCheck, IconImage, IconNext, IconPalette, IconPin, IconPlus, IconX } from "./Icons";
import ColorSampler, { MainColours } from "./ColorSampler";

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
  const [colourFrom, setColourFrom] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);
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

  // Functional so several colours added in one tap ("Add all") don't overwrite each other.
  function setColors(fn: (colors: string[]) => string[]) {
    dirty.current = true;
    setData((d) => {
      const next = { ...d, colors: fn(d.colors).slice(0, 12) };
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
    if (dirty.current || pending.length) setConfirmLeave(true);
    else exit();
  }

  function exit() {
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
  // Colour-scheme shots first, then every other photo of the building.
  const colourPhotos = [...data.images.colorScheme.photos, ...allPhotos(data).filter((p) => p.slot !== "colorScheme")];
  const colourFile = colourPhotos.find((p) => p.file === colourFrom)?.file ?? colourPhotos[0]?.file;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      {/* Top bar */}
      <header className="border-b border-border px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Button variant="ghost" size="icon-xl" onClick={leave} aria-label={t("close")} className="-ml-2">
            <IconX />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">
              {step + 1}/{STEPS.length} · {record ? `${t("edit")} ${record.plotNo}` : t("newRecord")}
            </p>
            <h1 className="truncate text-lg font-bold">{t(STEPS[step])}</h1>
          </div>
          {pending.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${waitingCount ? "bg-yellow-400" : "animate-pulse bg-brand"}`} />
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
              className={`h-1 flex-1 rounded-full transition ${i <= step ? "bg-foreground" : "bg-border"}`}
            />
          ))}
        </div>
      </header>

      {/* Body */}
      <div ref={scroller} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-5">
          {justSaved && step === 0 && (
            <Alert className="mb-5 flex items-center gap-3 rounded-2xl border-none bg-ok/15 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ok text-background">
                <IconCheck />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ok">
                  {t("saved")} · {justSaved.plotNo}
                </p>
                <p className="text-sm text-muted-foreground">
                  {justSaved.photos} {t("photos")} · {t("nextBuilding")}
                </p>
              </div>
              <Link href={`/r/${justSaved.id}`} className="shrink-0 text-sm font-semibold underline">
                {t("viewIt")}
              </Link>
            </Alert>
          )}
          {draftRestored && step === 0 && (
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-secondary px-4 py-3 text-sm">
              <span>{t("draftRestored")}</span>
              <Button variant="link" onClick={startOver} className="h-auto p-0 font-semibold text-brand">
                {t("discardDraft")}
              </Button>
            </div>
          )}

          {step === 0 && (
            <div className="space-y-7">
              <div>
                <FieldLabel htmlFor="plot" className="text-muted-foreground">
                  {t("plotNo")}
                </FieldLabel>
                <Input
                  id="plot"
                  value={data.plotNo}
                  onChange={(e) => update({ plotNo: e.target.value })}
                  placeholder="A-12"
                  autoComplete="off"
                  autoCapitalize="characters"
                  enterKeyHint="next"
                  onKeyDown={(e) => e.key === "Enter" && canNext && setStep(1)}
                  className="mt-2 h-auto rounded-2xl bg-card px-4 py-4 text-3xl font-bold tracking-wide md:text-3xl"
                />
                <p className="mt-2 text-sm text-muted-foreground">{t("plotHint")}</p>
                {duplicate && (
                  <Alert className="mt-3 rounded-2xl border-none bg-brand/10 text-brand">
                    <IconAlert className="size-5" />
                    <AlertDescription className="text-brand">
                      <span>
                        {t("duplicate")}{" "}
                        <Link href={`/r/${duplicate.id}`} className="font-semibold">
                          {t("openExisting")}
                        </Link>
                      </span>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("location")}</p>
                <Button
                  variant="secondary"
                  size="xl"
                  onClick={useMyLocation}
                  disabled={locating}
                  className="mt-2 min-h-14 w-full rounded-2xl"
                >
                  <IconPin />
                  {locating ? t("locating") : t("useMyLocation")}
                </Button>
                <Input                  value={data.mapLink}
                  onChange={(e) => {
                    const v = e.target.value;
                    const c = coordsFromLink(v);
                    update({ mapLink: v, lat: c?.lat ?? null, lng: c?.lng ?? null });
                  }}
                  placeholder={t("pasteMapLink")}
                  inputMode="url"
                  autoComplete="off"
                  className="mt-2 h-12 rounded-2xl bg-card px-4 md:text-sm"
                />
                {locError && <p className="mt-2 text-sm text-brand">{locError}</p>}
                <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                  {data.mapLink ? (
                    <>
                      <span className="truncate text-muted-foreground">
                        {data.lat !== null ? `${data.lat}, ${data.lng}` : t("linkSaved")}
                      </span>
                      <a
                        href={/^https?:\/\//i.test(data.mapLink) ? data.mapLink : data.lat !== null ? mapsLink(data.lat, data.lng!) : "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 font-semibold text-brand"
                      >
                        {t("openMaps")} ↗
                      </a>
                    </>
                  ) : (
                    <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="text-muted-foreground underline">
                      {t("findOnMaps")}
                    </a>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("group")}</p>
                {/* Buildings belong to the surveyor's group (option B), so this is fixed. */}
                {(() => {
                  const g = groupOf(record?.group ?? user.group)!;
                  return (
                    <div className="mt-2 flex items-center gap-3 rounded-2xl p-3" style={{ background: g.color, color: g.ink }}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/85 text-lg font-bold" style={{ color: g.color }}>
                        {g.id}
                      </span>
                      <span className="min-w-0 font-semibold">{L(g.label)}</span>
                    </div>
                  );
                })()}
                <p className="mt-2 text-xs text-muted-foreground">{t("groupOwns")}</p>
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
              <p className="text-sm text-muted-foreground">
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
                {colourPhotos.length > 0 && colourFile ? (
                  <>
                    <p className="mt-1 text-sm text-muted-foreground">{t("pickFromPhoto")}</p>
                    <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 py-1">
                      {colourPhotos.map((p) => (
                        <button
                          key={p.file}
                          onClick={() => setColourFrom(p.file)}
                          aria-pressed={p.file === colourFile}
                          className={cn(
                            "ml-1 h-20 w-20 shrink-0 overflow-hidden rounded-xl transition",
                            p.file === colourFile ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "opacity-60",
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photoUrl(p.file, "thumb")} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 rounded-2xl bg-card p-3">
                      <MainColours
                        src={pixelUrl(colourFile, "thumb")}
                        colors={data.colors}
                        onAdd={(hexes) => setColors((cs) => [...cs, ...hexes.filter((h) => !cs.includes(h))])}
                        onRemove={(hex) => setColors((cs) => cs.filter((c) => c !== hex))}
                        // An empty scheme is filled straight away; unwanted colours can be deleted below.
                        onFound={(swatches) => setColors((cs) => (cs.length ? cs : swatches.map((s) => s.hex)))}
                      />
                      <Button variant="link" onClick={() => setSampling(colourFile)} className="mt-2 h-auto p-0 text-sm text-brand">
                        {t("pickByHand")}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{t("colorsNoPhoto")}</p>
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
                      <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-foreground">
                        <IconX className="size-3" />
                      </span>
                    </button>
                  ))}
                  <label className="flex h-12 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-3 text-sm text-muted-foreground">
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
                <FieldLabel htmlFor="notes" className="text-base font-semibold">
                  {t("notes")}
                </FieldLabel>
                <Textarea
                  id="notes"
                  value={data.notes}
                  onChange={(e) => update({ notes: e.target.value })}
                  placeholder={t("notesHint")}
                  rows={5}
                  className="mt-2 min-h-32 rounded-2xl bg-card px-4 py-3"
                />
              </section>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-2">
              <ReviewRow label={t("plotNo")} value={`${data.plotNo} · ${L(groupOf(data.group)!.label)}`} onEdit={() => setStep(0)} />
              <ReviewRow label={t("stepType")} value={typeLabel(data, lang)} onEdit={() => setStep(1)} empty={t("notSet")} />
              <ReviewRow label={t("stepFunction")} value={functionLabel(data, lang)} onEdit={() => setStep(2)} empty={t("notSet")} />
              <button onClick={() => setStep(3)} className="w-full rounded-2xl bg-card p-4 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("stepPhotos")}</span>
                  <span className="text-sm font-semibold">
                    {shotsDone(data)}/{IMAGE_SLOTS.length}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {IMAGE_SLOTS.map((s) => {
                    const p = data.images[s.key].photos[0];
                    return (
                      <div key={s.key} className="relative aspect-square overflow-hidden rounded-lg bg-secondary">
                        {p ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photoUrl(p.file, "thumb")} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center px-1 text-center text-[10px] text-muted-foreground">
                            {L(s.label)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </button>
              <button onClick={() => setStep(4)} className="w-full rounded-2xl bg-card p-4 text-left">
                <span className="text-sm text-muted-foreground">{t("stepColors")}</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.colors.map((c) => (
                    <span key={c} className="h-6 w-6 rounded-md" style={{ background: c }} />
                  ))}
                </div>
                {data.notes && <p className="mt-2 line-clamp-3 text-sm whitespace-pre-line">{data.notes}</p>}
              </button>
              <p className="pt-2 text-center text-xs text-muted-foreground">
                {t("filledBy")} {user.name} · {L(groupOf(user.group)!.label)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <footer className="border-t border-border bg-background px-4 pt-3 pb-safe">
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
              <Button variant="secondary" size="xl" onClick={() => setStep(step - 1)} className="pr-6 pl-4">
                <IconBack />
                {t("back")}
              </Button>
            )}
            {isLast ? (
              <Button size="xl" onClick={save} disabled={saving || pending.length > 0} className="flex-1">
                {saving ? t("saving") : uploading > 0 ? t("waitUploads") : waitingCount > 0 ? t("waitSignal") : t("save")}
              </Button>
            ) : (
              <Button size="xl" onClick={() => setStep(step + 1)} disabled={!canNext} className="flex-1">
                {optionalStep && !(step === 1 ? data.buildingType : data.function) ? t("skip") : t("next")}
                <IconNext />
              </Button>
            )}
          </div>
        </div>
      </footer>

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      <input ref={galleryInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />

      <ConfirmDialog open={confirmLeave} onOpenChange={setConfirmLeave} title={t("discard")} confirmLabel={t("leave")} onConfirm={exit} />

      {sampling && (
        <ColorSampler
          src={pixelUrl(sampling)}
          paletteSrc={pixelUrl(sampling, "thumb")}
          colors={data.colors}
          onAdd={(hexes) => setColors((cs) => [...cs, ...hexes.filter((h) => !cs.includes(h))])}
          onRemove={(hex) => setColors((cs) => cs.filter((c) => c !== hex))}
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
          <Button
            key={o.id}
            variant={value === o.id ? "default" : "outline"}
            aria-pressed={value === o.id}
            onClick={() => onPick(o.id)}
            className={cn(
              "h-auto min-h-20 items-end justify-start rounded-2xl p-3.5 text-left text-[15px] leading-snug whitespace-normal active:scale-[0.98]",
              value === o.id ? "border-foreground hover:bg-foreground" : "bg-card dark:bg-card",
            )}
          >
            {L(o.label)}
          </Button>
        ))}
      </div>
      {value === "other" && (
        <Input autoFocus className="mt-3 h-12 rounded-2xl bg-card px-4" placeholder={t("describe")} value={other} onChange={(e) => onOther(e.target.value)} />
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
  const [discarding, setDiscarding] = useState<Pending | null>(null);
  const has = slot.photos.length > 0;
  const empty = !has && pending.length === 0;

  return (
    <div className={`rounded-2xl border p-3 transition ${has ? "border-ok/30 bg-card" : "border-border bg-card"}`}>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            has ? "bg-ok text-background" : "bg-secondary text-muted-foreground"
          }`}
        >
          {has ? <IconCheck className="size-4" /> : index}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{L(label)}</p>
          <p className="truncate text-xs text-muted-foreground">{L(hint)}</p>
        </div>
        {has && (
          <span className="shrink-0 rounded-full bg-ok/15 px-2.5 py-1 text-xs font-semibold text-ok">
            {slot.photos.length} {t("photos")}
          </span>
        )}
      </div>

      {empty ? (
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" onClick={onCamera} className="h-24 flex-1 flex-col gap-1 rounded-xl text-sm active:scale-[0.98]">
            <IconCamera className="size-7" />
            {t("takePhoto")}
          </Button>
          <Button variant="outline" onClick={onGallery} className="h-24 w-24 flex-col gap-1 rounded-xl bg-transparent text-xs text-muted-foreground active:scale-[0.98]">
            <IconImage className="size-6" />
            {t("gallery")}
          </Button>
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
                <IconX className="size-4" />
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
                  <button onClick={() => setDiscarding(p)} className="text-[10px] text-muted-foreground underline">
                    {t("delete")}
                  </button>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={onCamera}
            className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl bg-secondary text-xs font-semibold active:scale-[0.98]"
          >
            <span className="relative">
              <IconCamera className="size-7" />
              <IconPlus className="absolute -top-1.5 -right-2.5 size-4 rounded-full bg-foreground p-0.5 text-background" />
            </span>
            {t("takeAnother")}
          </button>
          <button
            onClick={onGallery}
            className="flex h-24 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-xs text-muted-foreground active:scale-[0.98]"
          >
            <IconImage />
            {t("gallery")}
          </button>
        </div>
      )}

      {showNote ? (
        <Input className="mt-3 h-10 rounded-2xl bg-card px-4 md:text-sm" placeholder={t("noteOptional")} value={slot.note} onChange={(e) => onNote(e.target.value)} />
      ) : (
        <Button variant="link" onClick={() => setShowNote(true)} className="mt-2 h-auto p-0 text-xs font-normal text-muted-foreground">
          + {t("noteOptional")}
        </Button>
      )}

      <ConfirmDialog
        open={discarding !== null}
        onOpenChange={(open) => !open && setDiscarding(null)}
        title={t("confirmDiscardPhoto")}
        confirmLabel={t("delete")}
        onConfirm={() => discarding && onDiscard(discarding)}
      />
    </div>
  );
}

function ReviewRow({ label, value, onEdit, empty }: { label: string; value: string; onEdit: () => void; empty?: string }) {
  return (
    <button onClick={onEdit} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-card p-4 text-left">
      <span className="min-w-0">
        <span className="block text-sm text-muted-foreground">{label}</span>
        <span className={`block truncate font-semibold ${value ? "" : "text-brand"}`}>{value || empty}</span>
      </span>
      <IconNext className="size-5 shrink-0 text-muted-foreground" />
    </button>
  );
}
