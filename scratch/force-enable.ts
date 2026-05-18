import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getAdminDb } from "../lib/firebase-admin";

async function main() {
  const db = getAdminDb();
  if(!db) { console.error("no db"); return; }
  const docRef = db.collection("chatbots").doc("zOh4ScBMyfMdlCMj5nrvzcuKtSi2");
  const snap = await docRef.get();
  const data = snap.data();
  if(data && data.gamification) {
    data.gamification.enabled = true;
    await docRef.update({ gamification: data.gamification });
    console.log("Successfully forced enabled: true");
  } else {
    console.log("No gamification data found");
  }
}

main().catch(console.error);
