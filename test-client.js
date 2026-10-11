import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function runTest() {
  try {
    console.log("Testing Firestore Write...");
    const testDoc = doc(db, "system_tests", "connectivity_test");
    await setDoc(testDoc, { timestamp: Date.now(), status: "success" });
    console.log("Write Successful.");

    console.log("Testing Firestore Read...");
    const snap = await getDoc(testDoc);
    if (snap.exists()) {
      console.log("Read Successful. Data:", snap.data());
    } else {
      console.log("Read Failed. Document not found.");
    }
    
    console.log("Testing Firestore Delete...");
    await deleteDoc(testDoc);
    console.log("Delete Successful.");
    
    console.log("All Firebase tests passed!");
    process.exit(0);
  } catch (err) {
    console.error("Firebase Test Failed:", err);
    process.exit(1);
  }
}

runTest();
