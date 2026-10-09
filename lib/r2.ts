// Cloudflare R2 (S3-compatible) access via short-lived signed URLs.
// Phones upload straight to R2 and load photos straight from R2, so the large
// files never pass through the web server.
import { AwsClient } from "aws4fetch";

const env = () => ({
  account: process.env.R2_ACCOUNT_ID,
  key: process.env.R2_ACCESS_KEY_ID,
  secret: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
});

export const r2Enabled = () => {
  const e = env();
  return Boolean(e.account && e.key && e.secret && e.bucket);
};

let client: AwsClient | null = null;
function aws() {
  const e = env();
  client ??= new AwsClient({ accessKeyId: e.key!, secretAccessKey: e.secret!, service: "s3", region: "auto" });
  return client;
}

function objectUrl(key: string) {
  const e = env();
  return new URL(`https://${e.account}.r2.cloudflarestorage.com/${e.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`);
}

// AWS "basic" timestamp, e.g. 20261009T140000Z.
function amzDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

async function presign(method: "GET" | "PUT", key: string, expiresSec: number, params: Record<string, string> = {}, at = new Date()) {
  const url = objectUrl(key);
  url.searchParams.set("X-Amz-Expires", String(expiresSec));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const signed = await aws().sign(url.toString(), { method, aws: { signQuery: true, datetime: amzDate(at) } });
  return signed.url;
}

export const fullKey = (name: string) => `photos/${name}`;
export const thumbKey = (name: string) => `thumbs/${name}`;

export function presignUpload(key: string) {
  return presign("PUT", key, 15 * 60);
}

// Signed with the time rounded down to the hour, so the same photo gets the same
// URL for an hour and phones can cache it instead of re-downloading.
export function presignView(key: string, downloadName?: string) {
  const hour = new Date();
  hour.setUTCMinutes(0, 0, 0);
  const params: Record<string, string> = {};
  if (downloadName) params["response-content-disposition"] = downloadName;
  return presign("GET", key, 2 * 3600, params, hour);
}

export async function getObject(key: string): Promise<Uint8Array | null> {
  const res = await aws().fetch(objectUrl(key).toString());
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`R2 GET ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function deleteObject(key: string) {
  const res = await aws().fetch(objectUrl(key).toString(), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`R2 DELETE ${res.status}`);
}
