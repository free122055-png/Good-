const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const config = require('./firebase-applet-config.json');

const app = initializeApp({
  projectId: config.projectId
});
const db = getFirestore(app, config.firestoreDatabaseId);

db.collection('products').limit(1).get()
  .then(snapshot => {
    console.log("Success! Docs found:", snapshot.size);
    process.exit(0);
  })
  .catch(err => {
    console.error("Error connecting to Firestore:", err);
    process.exit(1);
  });
