import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth as getFirebaseAuth } from "firebase-admin/auth";

const args = process.argv.slice(2);
const revoke = args[0] === "--revoke";
const email = revoke ? args[1] : args[0];

if (!email || !email.includes("@")) {
  console.error(`Usage: node scripts/set-admin.mjs [--revoke] admin@example.com`);
  process.exitCode = 1;
} else {
  try {
    initializeApp({ credential: applicationDefault() });
    const auth = getFirebaseAuth();
    const user = await auth.getUserByEmail(email);
    const existingClaims = user.customClaims ?? {};

    if (revoke) {
      const { admin: _admin, ...remainingClaims } = existingClaims;
      await auth.setCustomUserClaims(user.uid, remainingClaims);
      console.log(`Admin claim revoked for UID ${user.uid}.`);
    } else {
      await auth.setCustomUserClaims(user.uid, { ...existingClaims, admin: true });
      console.log(`Admin claim assigned for UID ${user.uid}.`);
    }
  } catch {
    console.error("Admin claim operation failed.");
    process.exitCode = 1;
  }
}
