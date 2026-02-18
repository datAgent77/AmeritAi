#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const admin = require("firebase-admin");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

function normalizePrivateKey(value) {
  if (!value) return "";
  let key = value.trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  key = key.replace(/\\n/g, "\n");

  const hasHeader = key.includes("-----BEGIN PRIVATE KEY-----");
  const hasFooter = key.includes("-----END PRIVATE KEY-----");

  if (hasHeader && hasFooter) {
    const body = key
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\s/g, "");

    const chunks = body.match(/.{1,64}/g) || [];
    key =
      "-----BEGIN PRIVATE KEY-----\n" +
      chunks.join("\n") +
      "\n-----END PRIVATE KEY-----\n";
  }

  return key;
}

function serializeFirestoreValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof admin.firestore.Timestamp) {
    return {
      __type: "timestamp",
      value: value.toDate().toISOString(),
    };
  }

  if (value instanceof admin.firestore.GeoPoint) {
    return {
      __type: "geopoint",
      latitude: value.latitude,
      longitude: value.longitude,
    };
  }

  if (value instanceof admin.firestore.DocumentReference) {
    return {
      __type: "reference",
      path: value.path,
    };
  }

  if (Buffer.isBuffer(value)) {
    return {
      __type: "bytes",
      base64: value.toString("base64"),
    };
  }

  if (Array.isArray(value)) {
    return value.map(serializeFirestoreValue);
  }

  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = serializeFirestoreValue(v);
    }
    return out;
  }

  return value;
}

async function exportCollection(collectionRef) {
  const snapshot = await collectionRef.get();
  const docs = {};

  for (const doc of snapshot.docs) {
    const docData = serializeFirestoreValue(doc.data());
    const subCollections = await doc.ref.listCollections();

    if (subCollections.length > 0) {
      docData.__subcollections = {};
      for (const subCollection of subCollections) {
        docData.__subcollections[subCollection.id] = await exportCollection(
          subCollection
        );
      }
    }

    docs[doc.id] = docData;
  }

  return docs;
}

function resolveOutputPath(projectId) {
  const arg = process.argv[2];
  if (arg) {
    return path.resolve(process.cwd(), arg);
  }

  const now = new Date().toISOString().replace(/[:]/g, "-").replace(/\..+/, "");
  return path.resolve(
    process.cwd(),
    "../backups",
    `firestore-backup-${projectId}-${now}.json`
  );
}

async function main() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      "Missing env vars. Required: NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
    );
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  }

  const db = admin.firestore();
  const outputPath = resolveOutputPath(projectId);

  console.log(`Starting Firestore backup for project: ${projectId}`);
  console.log(`Output: ${outputPath}`);

  const topCollections = await db.listCollections();
  const payload = {
    projectId,
    exportedAt: new Date().toISOString(),
    collectionCount: topCollections.length,
    collections: {},
  };

  for (const collection of topCollections) {
    console.log(`Exporting collection: ${collection.id}`);
    payload.collections[collection.id] = await exportCollection(collection);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");

  const fileStats = fs.statSync(outputPath);
  const sizeMb = (fileStats.size / (1024 * 1024)).toFixed(2);
  console.log(`Backup completed. File size: ${sizeMb} MB`);
}

main().catch((err) => {
  console.error("Backup failed:", err?.message || err);
  process.exit(1);
});
