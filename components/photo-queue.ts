// Keeps every photo on the phone (IndexedDB) from the moment it's taken until
// the server has it. Survives bad signal, closed tabs, and Android killing the
// page while the camera app is open.
import type { ImageSlotKey, Person } from "@/lib/schema";

export type QueuedPhoto = {
  id: string;
  // "new" or a record id while in a form; "saved:<record id>" once that form was saved.
  context: string;
  slot: ImageSlotKey;
  blob: Blob;
  createdAt: number;
  by?: Person;
  file?: string; // set once uploaded, until it is attached to its building
};

const DB = "omnon";
const STORE = "pending-photos";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const s = req.result.createObjectStore(STORE, { keyPath: "id" });
      s.createIndex("context", "context");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => {
      db.close();
      resolve(req ? req.result : undefined);
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
}

export const queue = {
  put: (p: QueuedPhoto) => tx("readwrite", (s) => void s.put(p)).catch(() => {}),
  remove: (id: string) => tx("readwrite", (s) => void s.delete(id)).catch(() => {}),
  list: async (context: string): Promise<QueuedPhoto[]> => {
    try {
      const all = (await tx<QueuedPhoto[]>("readonly", (s) => s.index("context").getAll(context))) ?? [];
      return all.sort((a, b) => a.createdAt - b.createdAt);
    } catch {
      return [];
    }
  },
  all: async (): Promise<QueuedPhoto[]> => {
    try {
      const all = (await tx<QueuedPhoto[]>("readonly", (s) => s.getAll())) ?? [];
      return all.sort((a, b) => a.createdAt - b.createdAt);
    } catch {
      return [];
    }
  },
  clear: async (context: string) => {
    for (const p of await queue.list(context)) await queue.remove(p.id);
  },
};
