// Record storage: Postgres (e.g. Neon) when DATABASE_URL is set, otherwise a
// local JSON file — fine for development and offline LAN use.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { allPhotos, type Person, type SurveyInput, type SurveyRecord } from "./schema";
import { deletePhotos } from "./photos";

type Backend = {
  list(): Promise<SurveyRecord[]>;
  // Records changed after `since`, plus the total count (to spot deletions).
  changes(since: string): Promise<{ records: SurveyRecord[]; count: number }>;
  get(id: string): Promise<SurveyRecord | null>;
  insert(r: SurveyRecord): Promise<void>;
  // Applies `fn` to the current record atomically; returns [before, after].
  modify(id: string, fn: (r: SurveyRecord) => SurveyRecord): Promise<[SurveyRecord, SurveyRecord] | null>;
  remove(id: string): Promise<SurveyRecord | null>;
};

// ---------- Postgres ----------

let sql: postgres.Sql | null = null;
let ready: Promise<unknown> | null = null;

function pg(): Backend {
  sql ??= postgres(process.env.DATABASE_URL!, { max: 5, idle_timeout: 20, prepare: false });
  ready ??= sql`
    create table if not exists survey_records (
      id uuid primary key,
      data jsonb not null,
      updated_at timestamptz not null default now()
    )`;
  const db = sql;
  const json = (r: SurveyRecord) => db.json(r as unknown as postgres.JSONValue);
  return {
    async list() {
      await ready;
      const rows = await db<{ data: SurveyRecord }[]>`select data from survey_records order by updated_at desc`;
      return rows.map((r) => r.data);
    },
    async changes(since) {
      await ready;
      const [rows, [c]] = await Promise.all([
        db<{ data: SurveyRecord }[]>`select data from survey_records where updated_at > ${since} order by updated_at desc`,
        db<{ n: number }[]>`select count(*)::int as n from survey_records`,
      ]);
      return { records: rows.map((r) => r.data), count: c.n };
    },
    async get(id) {
      await ready;
      const [row] = await db<{ data: SurveyRecord }[]>`select data from survey_records where id = ${id}`;
      return row?.data ?? null;
    },
    async insert(r) {
      await ready;
      await db`insert into survey_records (id, data, updated_at) values (${r.id}, ${json(r)}, ${r.updatedAt})`;
    },
    async modify(id, fn) {
      await ready;
      return db.begin(async (tx) => {
        const [row] = await tx<{ data: SurveyRecord }[]>`select data from survey_records where id = ${id} for update`;
        if (!row) return null;
        const next = fn(row.data);
        await tx`update survey_records set data = ${json(next)}, updated_at = ${next.updatedAt} where id = ${id}`;
        return [row.data, next] as [SurveyRecord, SurveyRecord];
      });
    },
    async remove(id) {
      await ready;
      const [row] = await db<{ data: SurveyRecord }[]>`delete from survey_records where id = ${id} returning data`;
      return row?.data ?? null;
    },
  };
}

// ---------- JSON file ----------

const DATA_DIR = path.join(process.cwd(), "data");
const RECORDS_FILE = path.join(DATA_DIR, "records.json");

// Serialise all writes so concurrent surveyors don't clobber each other.
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function load(): Promise<SurveyRecord[]> {
  try {
    return JSON.parse(await readFile(RECORDS_FILE, "utf8")) as SurveyRecord[];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function save(records: SurveyRecord[]) {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${RECORDS_FILE}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(records), "utf8");
  await rename(tmp, RECORDS_FILE);
}

const file: Backend = {
  async list() {
    return (await load()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async changes(since) {
    const all = await load();
    return { records: all.filter((r) => r.updatedAt > since), count: all.length };
  },
  async get(id) {
    return (await load()).find((r) => r.id === id) ?? null;
  },
  insert: (r) =>
    exclusive(async () => {
      const records = await load();
      records.push(r);
      await save(records);
    }),
  modify: (id, fn) =>
    exclusive(async () => {
      const records = await load();
      const i = records.findIndex((r) => r.id === id);
      if (i === -1) return null;
      const before = records[i];
      records[i] = fn(before);
      await save(records);
      return [before, records[i]] as [SurveyRecord, SurveyRecord];
    }),
  remove: (id) =>
    exclusive(async () => {
      const records = await load();
      const target = records.find((r) => r.id === id);
      if (!target) return null;
      await save(records.filter((r) => r.id !== id));
      return target;
    }),
};

const backend = () => (process.env.DATABASE_URL ? pg() : file);

// ---------- Public API ----------

export const listRecords = () => backend().list();
export const recordChanges = (since: string) => backend().changes(since);
export const getRecord = (id: string) => backend().get(id);

export async function createRecord(input: SurveyInput, by: Person) {
  const now = new Date().toISOString();
  const record: SurveyRecord = {
    ...input,
    id: randomUUID(),
    createdBy: by,
    updatedBy: by,
    history: [{ by: by.name, group: by.group, at: now, action: "created" }],
    createdAt: now,
    updatedAt: now,
  };
  await backend().insert(record);
  return record;
}

export async function updateRecord(id: string, input: SurveyInput, by: Person) {
  const now = new Date().toISOString();
  const result = await backend().modify(id, (before) => ({
    ...before,
    ...input,
    id,
    updatedBy: by,
    updatedAt: now,
    history: [...(before.history ?? []), { by: by.name, group: by.group, at: now, action: "edited" as const }].slice(-50),
  }));
  if (!result) return null;
  const [before, after] = result;
  const keep = new Set(allPhotos(after).map((p) => p.file));
  await deletePhotos(allPhotos(before).map((p) => p.file).filter((f) => !keep.has(f)));
  return after;
}

export async function deleteRecord(id: string) {
  const removed = await backend().remove(id);
  if (!removed) return false;
  await deletePhotos(allPhotos(removed).map((p) => p.file));
  return true;
}
