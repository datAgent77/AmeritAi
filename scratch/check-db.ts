import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getAdminDb } from "../lib/firebase-admin";

async function main() {
  const db = getAdminDb();
  if(!db) { console.error("no db"); return; }
  const snap = await db.collection("chatbots").doc("zOh4ScBMyfMdlCMj5nrvzcuKtSi2").get();
  const data = snap.data();
  console.log("gamification data:", JSON.stringify(data?.gamification, null, 2));
}

main().catch(console.error);
