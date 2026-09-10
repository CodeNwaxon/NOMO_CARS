import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function buildDriverSearchTokens(...values) {
  const tokens = new Set();
  const searchText = values
    .map((value) => String(value || ""))
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");

  for (const word of searchText.split(/\s+/).filter(Boolean)) {
    for (let length = 2; length <= word.length; length += 1) {
      tokens.add(word.slice(0, length));
    }
  }

  return Array.from(tokens);
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!getApps().length) {
  if (serviceAccountJson) {
    initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  } else if (projectId && privateKey && clientEmail) {
    initializeApp({ credential: cert({ projectId, privateKey, clientEmail }) });
  } else {
    throw new Error("Missing Firebase Admin credentials. Configure .env.local first.");
  }
}

const db = getFirestore();
const snapshot = await db.collection("users").where("role", "==", "driver").get();
let batch = db.batch();
let writesInBatch = 0;
let updated = 0;

for (const driverDoc of snapshot.docs) {
  const data = driverDoc.data();
  batch.update(driverDoc.ref, {
    searchTokens: buildDriverSearchTokens(
      data.firstName,
      data.middleName,
      data.lastName,
      data.username,
      data.operatingCity,
      data.operatingState,
    ),
  });
  writesInBatch += 1;
  updated += 1;

  if (writesInBatch === 500) {
    await batch.commit();
    batch = db.batch();
    writesInBatch = 0;
  }
}

if (writesInBatch > 0) {
  await batch.commit();
}

console.log(`Updated search tokens for ${updated} drivers.`);
