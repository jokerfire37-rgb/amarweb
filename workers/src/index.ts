import { importX509, jwtVerify } from "jose";

interface Env {
  FIREBASE_PROJECT_ID: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  ALLOWED_ORIGIN: string;
  CLOUDINARY_API_SECRET: string;
}

interface FirebaseCertificates {
  [keyId: string]: string;
}

const allowedFormats = new Set(["jpg", "png", "webp", "gif", "svg"]);
const certificatesUrl = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
let cachedCertificates: { certificates: FirebaseCertificates; expiresAt: number } | undefined;

function corsHeaders(origin: string, allowedOrigin: string) {
  return {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": origin === allowedOrigin ? origin : allowedOrigin,
    "Content-Type": "application/json",
  };
}

function jsonResponse(body: Record<string, unknown>, status: number, origin: string, allowedOrigin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(origin, allowedOrigin),
  });
}

async function getCertificates(): Promise<FirebaseCertificates> {
  if (cachedCertificates && cachedCertificates.expiresAt > Date.now()) {
    return cachedCertificates.certificates;
  }

  const response = await fetch(certificatesUrl);
  if (!response.ok) {
    throw new Error("Firebase certificate lookup failed.");
  }

  const certificates = JSON.parse(await response.text()) as FirebaseCertificates;
  const cacheControl = response.headers.get("cache-control") || "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 3600000;
  cachedCertificates = { certificates, expiresAt: Date.now() + maxAge };
  return certificates;
}

async function verifyFirebaseAdminToken(token: string, projectId: string) {
  const header = JSON.parse(atob(token.split(".")[0])) as { alg?: string; kid?: string };
  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Invalid Firebase token header.");
  }

  const certificates = await getCertificates();
  const certificate = certificates[header.kid];
  if (!certificate) {
    cachedCertificates = undefined;
    throw new Error("Unknown Firebase token key.");
  }

  const publicKey = await importX509(certificate, "RS256");
  const { payload } = await jwtVerify(token, publicKey, {
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });

  if (payload.admin !== true || typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("Administrator access required.");
  }
}

async function createCloudinarySignature(parameters: Record<string, string | number>, secret: string) {
  const payload = Object.keys(parameters)
    .sort()
    .map((key) => `${key}=${parameters[key]}`)
    .join("&");
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(`${payload}${secret}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env.ALLOWED_ORIGIN) });
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed." }, 405, origin, env.ALLOWED_ORIGIN);
    }
    if (origin !== env.ALLOWED_ORIGIN) {
      return jsonResponse({ error: "Origin not allowed." }, 403, origin, env.ALLOWED_ORIGIN);
    }

    const authorization = request.headers.get("Authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) {
      return jsonResponse({ error: "Authentication required." }, 401, origin, env.ALLOWED_ORIGIN);
    }

    try {
      await verifyFirebaseAdminToken(token, env.FIREBASE_PROJECT_ID);
      const body = JSON.parse(await request.text()) as { format?: unknown };
      const format = typeof body.format === "string" ? body.format : "";
      if (!allowedFormats.has(format)) {
        return jsonResponse({ error: "Unsupported image format." }, 400, origin, env.ALLOWED_ORIGIN);
      }
      if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
        return jsonResponse({ error: "Upload service unavailable." }, 503, origin, env.ALLOWED_ORIGIN);
      }

      const parameters = {
        folder: "amar-printers",
        format,
        timestamp: Math.floor(Date.now() / 1000),
      };
      return jsonResponse({
        apiKey: env.CLOUDINARY_API_KEY,
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        folder: parameters.folder,
        format,
        signature: await createCloudinarySignature(parameters, env.CLOUDINARY_API_SECRET),
        timestamp: parameters.timestamp,
      }, 200, origin, env.ALLOWED_ORIGIN);
    } catch {
      return jsonResponse({ error: "Authentication failed." }, 401, origin, env.ALLOWED_ORIGIN);
    }
  },
};