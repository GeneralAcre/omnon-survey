# Om Non Survey

Mobile-first field survey app for the **Khlong Om Non Workshop**, Xi'an University of Architecture and Technology × Faculty of Architecture, Chulalongkorn University.

Students sign in with their name, then record buildings along the canal: plot number, building type, function, and any number of photos per shot (Front, Left, Right, Back, Materials, Pattern, Special elements, Color scheme). Every photo and record keeps who took it. English / ไทย.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in, or leave empty to store everything in ./data
npm run dev
```

To let phones on the same Wi-Fi use it: `npm run build && npx next start -H 0.0.0.0`, then open `http://<laptop-IP>:3000`.

## Storage

| What | With env vars set | Without |
| --- | --- | --- |
| Photos | Cloudflare R2 (`R2_*`) — phones upload and download directly via signed URLs | `data/uploads/` |
| Records | Postgres (`DATABASE_URL`, e.g. Neon) | `data/records.json` |

The R2 bucket needs a CORS rule allowing `GET` and `PUT` with the `Content-Type` header from the site's origin. The API token needs **Object Read & Write** on the bucket.

## Google Drive copy

New photos are copied into a Google Drive folder every 5 minutes by [scripts/drive-sync.gs](scripts/drive-sync.gs), which runs in Google Apps Script under your own Google account. R2 stays the main store. Photos deleted on the site stay in Drive, and renaming a plot only affects photos copied after that.

1. Sign in to the Google account that can edit the Drive folder and open [script.google.com](https://script.google.com) → **New project**.
2. Paste in `scripts/drive-sync.gs` and set `SITE_URL` to the live site.
3. Choose `setup` in the function menu, press **Run**, and allow the permissions it asks for.

It uses that account's Drive storage. If that account changes, remove the timer and repeat these steps from the new one.

## Exports

From the menu: photos as a ZIP sorted into `Group / Plot / Shot` folders with readable file names, a CSV for Excel / Google Sheets (with photo links, photographers, and map links), or raw JSON.
