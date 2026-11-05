// Copies new survey photos from the website into a Google Drive folder.
// Runs in Google Apps Script under your own Google account, not on the website.
// Setup steps are in the README under "Google Drive copy".

const SITE_URL = "https://omnon-survey.vercel.app"; // the live website, no trailing slash
const FOLDER_ID = "13VcW9Uf7qTuSAZIZtDkYdSwMxmmdPIRO";

const SYNCED_FILE = "_synced-photos-do-not-delete.txt"; // one copied photo per line
const MAX_RUN_MS = 4.5 * 60 * 1000; // Google stops a script at 6 minutes

// Run this once by hand: copies what's there now and starts the 5-minute timer.
function setup() {
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("syncPhotos").timeBased().everyMinutes(5).create();
  syncPhotos();
}

function syncPhotos() {
  const started = Date.now();
  const root = DriveApp.getFolderById(FOLDER_ID);
  const log = syncedLog(root);
  const synced = new Set(log.getBlob().getDataAsString().split("\n").filter(Boolean));

  const res = UrlFetchApp.fetch(`${SITE_URL}/api/drive/manifest`, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error(`Manifest failed: ${res.getResponseCode()}`);
  const pending = JSON.parse(res.getContentText()).filter((p) => !synced.has(p.file));

  const folders = {};
  let copied = 0;
  try {
    for (const p of pending) {
      if (Date.now() - started > MAX_RUN_MS) break; // the next run carries on from here
      // One bad photo shouldn't stop the rest; it's tried again next run.
      try {
        const photo = UrlFetchApp.fetch(`${SITE_URL}/api/photos/${p.file}`, { muteHttpExceptions: true });
        if (photo.getResponseCode() !== 200) throw new Error(`HTTP ${photo.getResponseCode()}`);
        folderFor(root, p.dirs, folders).createFile(photo.getBlob().setName(p.name));
        synced.add(p.file);
        copied++;
      } catch (e) {
        console.warn(`Skipped ${p.name}: ${e}`);
      }
    }
  } finally {
    if (copied) log.setContent([...synced].join("\n"));
  }
  console.log(`Copied ${copied} of ${pending.length} new photos`);
}

function syncedLog(root) {
  const found = root.getFilesByName(SYNCED_FILE);
  return found.hasNext() ? found.next() : root.createFile(SYNCED_FILE, "", "text/plain");
}

// Walks down dirs, making any folder that isn't there yet.
function folderFor(root, dirs, cache) {
  let folder = root;
  let path = "";
  for (const dir of dirs) {
    path += `/${dir}`;
    if (!cache[path]) {
      const found = folder.getFoldersByName(dir);
      cache[path] = found.hasNext() ? found.next() : folder.createFolder(dir);
    }
    folder = cache[path];
  }
  return folder;
}
