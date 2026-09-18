# Firebase admin setup

The claim-management script uses Google Application Default Credentials. Run it only on a trusted local machine with permission to administer the Firebase project. Credentials must never be placed in `src/` or committed.

Create the first administrator:

```sh
GOOGLE_APPLICATION_CREDENTIALS=/path/to/ignored/service-account.json node scripts/set-admin.mjs admin@example.com
```

On Windows PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\path\to\ignored\service-account.json'
node scripts/set-admin.mjs admin@example.com
```

Revoke administrator access while preserving other custom claims:

```sh
node scripts/set-admin.mjs --revoke admin@example.com
```

After assigning or revoking a claim, sign out and sign back in, or wait for the frontend ID-token refresh to observe the change.

## Signed Cloudinary uploads

The signing endpoint runs as a Cloudflare Worker so Firebase can remain on the Spark plan. From the `workers` directory, install dependencies and configure the non-secret Worker variables in `workers/wrangler.jsonc`:

```sh
npm install
npx wrangler login
npx wrangler secret put CLOUDINARY_API_SECRET
npx wrangler deploy
```

Set `FIREBASE_PROJECT_ID`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `ALLOWED_ORIGIN` in the Worker configuration. Store `CLOUDINARY_API_SECRET` only with `wrangler secret put`; never place it in React, Vite variables, `vars`, or committed files.

Set the deployed Worker URL as `VITE_CLOUDINARY_SIGNING_URL` in the frontend deployment environment, then rebuild. Do not use the old unsigned Cloudinary upload preset.

In Cloudinary, also configure the upload limit to 5 MB and restrict allowed image formats to JPEG, PNG, WebP, GIF, and SVG. The browser performs the same checks for usability, but Cloudinary must enforce these limits server-side.

Rules can be deployed without changing production data:

```sh
firebase deploy --only firestore:rules,storage
```

