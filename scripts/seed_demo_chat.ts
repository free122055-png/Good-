import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const projectId = "gen-lang-client-0777100836";
const databaseId = "ai-studio-almayadinbazar-ba908b47-5867-409c-b05f-1cab5d17076c";

if (getApps().length === 0) {
  initializeApp({
    projectId: projectId,
  });
}

const db = getFirestore(databaseId);

async function seed() {
  console.log("Starting seed...");

  const targetEmail = "free122055@gmail.com";
  const userSnap = await db.collection("users").where("email", "==", targetEmail).limit(1).get();

  if (userSnap.empty) {
    console.error(`User with email ${targetEmail} not found. Please log in first so your user document is created.`);
    // I'll create a dummy user document if it doesn't exist, but it might not have the correct UID.
    // Actually, I'll proceed with creating demo users and rooms, and use a placeholder UID if needed.
    // But it's better if I use a real UID.
  }

  const myUserDoc = userSnap.docs[0];
  const myUid = myUserDoc ? myUserDoc.id : "current_user_id_placeholder";
  const myName = myUserDoc ? myUserDoc.data().displayName : "You";

  const demoUsers = [
    {
      id: "demo_user_1",
      email: "sadia@demo.com",
      displayName: "Sadia Akter",
      username: "sadia_akter",
      photoURL: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
      status: "active",
      role: "customer",
      bio: "বিনিস্টা মেম্বার ✨",
      createdAt: Date.now()
    },
    {
      id: "demo_user_2",
      email: "tanzim@demo.com",
      displayName: "Tanzim Rahman",
      username: "tanzim_rahman",
      photoURL: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
      status: "active",
      role: "customer",
      bio: "লাইফস্টাইল এবং ফটোগ্রাফি 📸",
      createdAt: Date.now()
    },
    {
      id: "demo_user_3",
      email: "fahim@demo.com",
      displayName: "Fahim Ahmed",
      username: "fahim_pro",
      photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      status: "active",
      role: "customer",
      bio: "ডেভলপার ও ট্রাভেলার 🌍",
      createdAt: Date.now()
    }
  ];

  for (const user of demoUsers) {
    await db.collection("users").doc(user.id).set(user, { merge: true });
    console.log(`Demo user created: ${user.displayName}`);

    // Create Chat Room
    const roomId = [myUid, user.id].sort().join("_");
    const roomRef = db.collection("chat_rooms").doc(roomId);

    await roomRef.set({
      id: roomId,
      participants: [myUid, user.id],
      lastMessage: "হ্যালো! কেমন আছেন?",
      lastMessageAt: Date.now(),
      unreadCounts: {
        [myUid]: 1,
        [user.id]: 0
      },
      users: {
        [myUid]: {
          displayName: myName,
          photoURL: myUserDoc?.data().photoURL || ""
        },
        [user.id]: {
          displayName: user.displayName,
          photoURL: user.photoURL
        }
      }
    }, { merge: true });

    // Add initial messages
    const messages = [
      {
        senderId: user.id,
        text: `আসসালামু আলাইকুম, আমি ${user.displayName}।`,
        createdAt: Date.now() - 3600000,
        read: true,
        sentBy: "user"
      },
      {
        senderId: user.id,
        text: "বিনিস্টাতে আপনাকে স্বাগতম!",
        createdAt: Date.now() - 1800000,
        read: true,
        sentBy: "user"
      },
      {
        senderId: user.id,
        text: "হ্যালো! কেমন আছেন?",
        createdAt: Date.now(),
        read: false,
        sentBy: "user"
      }
    ];

    for (const msg of messages) {
      await roomRef.collection("messages").add(msg);
    }
    console.log(`Chat room and messages created for ${user.displayName}`);
  }

  console.log("Seeding complete!");
}

seed().catch(console.error);
