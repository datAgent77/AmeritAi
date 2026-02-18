import * as dotenv from "dotenv";
import * as path from "path";
import * as admin from "firebase-admin";
import { SEED_BLOG_POSTS } from "../lib/seed-cms-data";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const NEW_BLOG_SLUGS = [
  "ai-calisani-vs-chatbot-2026",
  "ecommerce-ai-personal-shopper-donusum-rehberi",
  "lead-collection-proactive-messaging-7-akis",
  "restoranlar-icin-dijital-garson-qr-menu-ai",
  "rag-dynamic-context-visual-analysis-ai-mimarisi",
  "ai-ile-seo-odakli-blog-icerik-uretimi",
  "cok-dilli-ai-destekte-kaliteyi-korumak",
  "kobi-icin-30-gunde-ai-calisani-kurulum-plani",
  "yapay-zeka-ile-satis-optimizasyonu-ve-cart-recovery",
  "ai-uygulamalarinda-kvkk-gdpr-guvenlik-rehberi-2026",
];

function normalizePrivateKey(value: string | undefined): string {
  if (!value) return "";
  let key = value.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
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

async function main() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing env vars: NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
    );
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

  const targetPosts = SEED_BLOG_POSTS.filter((post) =>
    NEW_BLOG_SLUGS.includes(post.slug)
  );

  if (targetPosts.length !== NEW_BLOG_SLUGS.length) {
    const found = new Set(targetPosts.map((post) => post.slug));
    const missing = NEW_BLOG_SLUGS.filter((slug) => !found.has(slug));
    throw new Error(`Missing blog entries in seed data: ${missing.join(", ")}`);
  }

  let created = 0;
  let updated = 0;

  for (const post of targetPosts) {
    const snapshot = await db
      .collection("cms_blog")
      .where("slug", "==", post.slug)
      .limit(1)
      .get();

    const payload = { ...post, published: true };

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.set(payload, { merge: true });
      updated += 1;
      console.log(`updated: ${post.slug}`);
    } else {
      await db.collection("cms_blog").add(payload);
      created += 1;
      console.log(`created: ${post.slug}`);
    }
  }

  console.log(
    `Publish completed. created=${created}, updated=${updated}, total=${targetPosts.length}`
  );
  console.log("Live URLs:");
  for (const post of targetPosts) {
    console.log(`- https://www.getvion.com/blog/${post.slug}`);
  }
}

main().catch((error) => {
  console.error("Publish failed:", error.message || error);
  process.exit(1);
});
