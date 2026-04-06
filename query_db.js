const admin = require("firebase-admin");
try {
  let cert = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!cert) {
     const fs = require('fs');
     const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
     const line = lines.find(l => l.startsWith('FIREBASE_SERVICE_ACCOUNT='));
     if (line) cert = line.replace('FIREBASE_SERVICE_ACCOUNT=', '').trim();
  }
  if (!cert) throw "No cert";
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(cert)) });
  const db = admin.firestore();
  
  (async () => {
    const snap = await db.collection('chatbots').where('companyName', '==', 'EAS Ai Asistant').get();
    if(snap.empty) {
        // try looking for anything with EAS
        const snap2 = await db.collection('chatbots').get();
        snap2.forEach(d => {
            const data = d.data();
            if(data.companyName && data.companyName.includes("EAS")) {
                console.log(d.id, data.companyName, data.chatDisplayMode);
            }
        });
    } else {
        snap.forEach(d => {
            const data = d.data();
            console.log(d.id, data.companyName, data.chatDisplayMode);
        });
    }
    process.exit(0);
  })();
} catch(e) { console.error(e); }
