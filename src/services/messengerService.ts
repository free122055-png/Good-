import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  serverTimestamp,
  getDocs 
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface ChatMessage {
  id: string;
  senderId?: string;
  sender: 'me' | 'other';
  text: string;
  time: string;
  timestamp?: number;
}

export interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  isOnline?: boolean;
  participants?: string[];
  messages: ChatMessage[];
}

export interface UserContact {
  uid: string;
  name: string;
  username: string;
  avatarUrl: string;
}

// Fallback local storage for offline or initial state
const STORAGE_KEY_CONV = 'binista_messenger_conversations_v3';

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    name: 'Rahim Ahmed',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    lastMessage: 'ভাই, আজ দেখা হবে তো? 😊',
    time: '2m',
    unreadCount: 1,
    isOnline: true,
    messages: [
      { id: 'm1', sender: 'other', text: 'ভাই, আজ দেখা হবে তো? 😊', time: '2m', timestamp: Date.now() - 120000 },
    ],
  },
  {
    id: '2',
    name: 'Sadia Akter',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    lastMessage: 'তোমার পাঠানো ছরিটি দারুণ হয়েছে! ❤️',
    time: '10m',
    unreadCount: 1,
    isOnline: true,
    messages: [
      { id: 'm1', sender: 'other', text: 'তোমার পাঠানো ছরিটি দারুণ হয়েছে! ❤️', time: '10m', timestamp: Date.now() - 600000 },
    ],
  },
];

export const ONLINE_FRIENDS = [
  { id: 'f1', name: 'Rafsan', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' },
  { id: 'f2', name: 'Mim', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80' },
  { id: 'f3', name: 'Sakib', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80' },
  { id: 'f4', name: 'Tanha', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80' },
];

export const getStoredConversations = (): Conversation[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONV);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load conversations from localStorage:', e);
  }
  return INITIAL_CONVERSATIONS;
};

export const saveStoredConversations = (conversations: Conversation[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_CONV, JSON.stringify(conversations));
  } catch (e) {
    console.warn('Failed to save conversations to localStorage:', e);
  }
};

// -------------------------------------------------------------
// REAL FIRESTORE MESSAGING FUNCTIONS
// -------------------------------------------------------------

export async function getOrCreateChatRoom(
  myUid: string,
  myName: string,
  myAvatar: string,
  otherUid: string,
  otherName: string,
  otherAvatar: string
): Promise<string> {
  const roomId = [myUid, otherUid].sort().join('_');
  const roomRef = doc(db, 'chat_rooms', roomId);
  const snap = await getDoc(roomRef);

  if (!snap.exists()) {
    await setDoc(roomRef, {
      participants: [myUid, otherUid],
      participantNames: {
        [myUid]: myName || 'User',
        [otherUid]: otherName || 'User',
      },
      participantAvatars: {
        [myUid]: myAvatar || '',
        [otherUid]: otherAvatar || '',
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: 'Started conversation',
    });
  }
  return roomId;
}

export async function sendFirestoreMessage(roomId: string, text: string, senderId: string): Promise<void> {
  if (!text.trim()) return;
  const messagesRef = collection(db, 'chat_rooms', roomId, 'messages');
  await addDoc(messagesRef, {
    senderId,
    text: text.trim(),
    timestamp: serverTimestamp(),
  });

  const roomRef = doc(db, 'chat_rooms', roomId);
  await updateDoc(roomRef, {
    lastMessage: text.trim(),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToChatMessages(
  roomId: string,
  currentUserId: string,
  callback: (messages: ChatMessage[]) => void
) {
  const messagesRef = collection(db, 'chat_rooms', roomId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const msgs: ChatMessage[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const timestamp = data.timestamp?.toMillis ? data.timestamp.toMillis() : (data.timestamp || Date.now());
      const dateObj = new Date(timestamp);
      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      msgs.push({
        id: docSnap.id,
        senderId: data.senderId,
        sender: data.senderId === currentUserId ? 'me' : 'other',
        text: data.text || '',
        time: timeStr,
        timestamp,
      });
    });
    callback(msgs);
  }, (error) => {
    console.error('Error in message snapshot listener:', error);
  });
}

export function subscribeToUserConversations(
  currentUserId: string,
  callback: (conversations: Conversation[]) => void
) {
  const roomsRef = collection(db, 'chat_rooms');
  const q = query(roomsRef, where('participants', 'array-contains', currentUserId));

  return onSnapshot(q, (snapshot) => {
    const convs: Conversation[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const participants = data.participants || [];
      const otherUid = participants.find((id: string) => id !== currentUserId) || currentUserId;
      const otherName = data.participantNames?.[otherUid] || 'BINISTA User';
      const otherAvatar = data.participantAvatars?.[otherUid] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
      const updatedAt = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now());
      const timeStr = new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      convs.push({
        id: docSnap.id,
        name: otherName,
        avatar: otherAvatar,
        lastMessage: data.lastMessage || 'New conversation',
        time: timeStr,
        participants,
        messages: [],
        isOnline: true,
      });
    });
    callback(convs);
  }, (error) => {
    console.warn('Error subscribing to conversations:', error);
  });
}

export async function fetchAllUsers(): Promise<UserContact[]> {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const users: UserContact[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      users.push({
        uid: docSnap.id,
        name: data.name || data.username || 'BINISTA User',
        username: data.username || 'user',
        avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      });
    });
    return users;
  } catch (e) {
    console.warn('Error fetching all users for messenger:', e);
    return [];
  }
}
