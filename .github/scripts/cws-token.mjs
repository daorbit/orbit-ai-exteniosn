import { createSign } from "node:crypto";

const key = JSON.parse(process.env.CWS_SERVICE_ACCOUNT ?? "{}");

if (!key.client_email || !key.private_key) {
  console.error("CWS_SERVICE_ACCOUNT is missing or is not a service account JSON key.");
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

const unsigned = [
  encode({ alg: "RS256", typ: "JWT" }),
  encode({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/chromewebstore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }),
].join(".");

const signature = createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");

const res = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: `${unsigned}.${signature}`,
  }),
});

const data = await res.json();

if (!data.access_token) {
  console.error(JSON.stringify(data));
  process.exit(1);
}

process.stdout.write(data.access_token);
