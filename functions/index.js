const crypto = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { defineSecret } = require("firebase-functions/params");
const { onRequest } = require("firebase-functions/v2/https");

initializeApp();
const cloudinaryApiSecret = defineSecret("CLOUDINARY_API_SECRET");

const allowedFormats = new Set(["jpg", "png", "webp", "gif", "svg"]);

function cloudinarySignature(parameters, secret) {
  const payload = Object.keys(parameters)
    .sort()
    .map((key) => `${key}=${parameters[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(`${payload}${secret}`).digest("hex");
}

exports.cloudinarySignUpload = onRequest({ cors: true, secrets: [cloudinaryApiSecret] }, async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  const authorization = request.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    if (decodedToken.admin !== true) {
      response.status(403).json({ error: "Administrator access required." });
      return;
    }

    const format = typeof request.body?.format === "string" ? request.body.format : "";
    if (!allowedFormats.has(format)) {
      response.status(400).json({ error: "Unsupported image format." });
      return;
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = cloudinaryApiSecret.value();
    if (!cloudName || !apiKey || !apiSecret) {
      response.status(503).json({ error: "Upload service unavailable." });
      return;
    }

    const parameters = {
      folder: "amar-printers",
      format,
      timestamp: Math.floor(Date.now() / 1000),
    };
    response.json({
      apiKey,
      cloudName,
      folder: parameters.folder,
      format,
      signature: cloudinarySignature(parameters, apiSecret),
      timestamp: parameters.timestamp,
    });
  } catch {
    response.status(401).json({ error: "Authentication failed." });
  }
});
