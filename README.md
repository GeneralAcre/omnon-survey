# Om Non Survey

Mobile-first field survey app for the **Khlong Om Non Workshop**, Xi'an University of Architecture and Technology × Faculty of Architecture, Chulalongkorn University.

Students sign in with their name and group, then record buildings along the canal: plot number, location (GPS or Google Maps link), building type, function, and any number of photos per shot (Front, Elevation A/B, Rear, Materials, Pattern, Special elements, Color scheme). Every photo and record keeps who took it and which group they're in. English / ไทย.

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

## Exports

From the menu: photos as a ZIP sorted into `Group / Plot / Shot` folders with readable file names, a CSV for Excel / Google Sheets (with photo links, photographers, and map links), or raw JSON.
