const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/FIREBASE_SERVICE_ACCOUNT=(.*)/);
const serviceAccount = JSON.parse(match[1]);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
db.collection("chatbots").get().then(snap => {
  snap.forEach(doc => {
    const data = doc.data();
    if(data.companyName && data.companyName.toLowerCase().includes("eas")) {
       console.log("Customer:", data.companyName, "Mode:", data.chatDisplayMode);
    }
  });
  process.exit(0);
});
