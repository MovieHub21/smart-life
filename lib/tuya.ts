import crypto from "crypto";

const endpoint = () => (process.env.TUYA_ENDPOINT || "https://openapi.tuyaeu.com").replace(/\/$/, "");

function sign(method: string, path: string, body = "", token = "") {
  const accessId = process.env.TUYA_ACCESS_ID;
  const secret = process.env.TUYA_ACCESS_KEY;
  if (!accessId || !secret) throw new Error("TUYA_ACCESS_ID and TUYA_ACCESS_KEY are required.");

  const t = Date.now().toString();
  const contentHash = crypto.createHash("sha256").update(body).digest("hex");
  const stringToSign = [method.toUpperCase(), contentHash, "", path].join("\\n");
  const payload = accessId + token + t + stringToSign;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex").toUpperCase();

  return {
    "client_id": accessId,
    "t": t,
    "sign_method": "HMAC-SHA256",
    "sign": signature,
    ...(token ? { "access_token": token } : {})
  };
}

async function token() {
  const path = "/v1.0/token?grant_type=1";
  const headers = sign("GET", path);
  const r = await fetch(endpoint() + path, { headers: { ...headers, "Content-Type":"application/json" }, cache:"no-store" });
  const data = await r.json();
  if (!r.ok || !data.success) throw new Error(data.msg || "Tuya token request failed");
  return data.result.access_token as string;
}

async function request(method: string, path: string, body?: unknown) {
  const accessToken = await token();
  const raw = body === undefined ? "" : JSON.stringify(body);
  const headers = sign(method, path, raw, accessToken);
  const r = await fetch(endpoint() + path, {
    method,
    headers: { ...headers, "Content-Type":"application/json" },
    body: raw || undefined,
    cache:"no-store"
  });
  const data = await r.json();
  if (!r.ok || data.success === false) throw new Error(data.msg || `Tuya API error (${r.status})`);
  return data;
}

export const tuyaGet = (path: string) => request("GET", path);
export const tuyaPost = (path: string, body: unknown) => request("POST", path, body);