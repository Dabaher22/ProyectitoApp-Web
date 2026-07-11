import {
  collection, doc, setDoc, getDoc, getDocs,
  addDoc, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Friendship {
  id: string;
  user1Id: string;
  user1Name: string;
  user2Id: string;
  user2Name: string;
  createdAt: any;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function generateFriendInvite(userId: string, userName: string): Promise<string> {
  const code = generateCode();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);
  await setDoc(doc(db, 'friendInvites', code), {
    userId, userName,
    createdAt: serverTimestamp(),
    expiresAt: expiresAt.toISOString(),
  });
  return code;
}

export async function addFriendWithCode(code: string, userId: string, userName: string): Promise<string> {
  const ref = doc(db, 'friendInvites', code.toUpperCase().trim());
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Código inválido o expirado.');
  const data = snap.data();
  if (new Date(data.expiresAt) < new Date()) throw new Error('El código ha expirado.');
  if (data.userId === userId) throw new Error('No puedes agregarte a ti mismo.');

  const [s1, s2] = await Promise.all([
    getDocs(query(collection(db, 'friendships'), where('user1Id', '==', userId), where('user2Id', '==', data.userId))),
    getDocs(query(collection(db, 'friendships'), where('user1Id', '==', data.userId), where('user2Id', '==', userId))),
  ]);
  if (!s1.empty || !s2.empty) throw new Error('Ya son amigos.');

  await addDoc(collection(db, 'friendships'), {
    user1Id: userId, user1Name: userName,
    user2Id: data.userId, user2Name: data.userName,
    createdAt: serverTimestamp(),
  });
  return data.userName;
}

export async function getFriendships(userId: string): Promise<Friendship[]> {
  const [s1, s2] = await Promise.all([
    getDocs(query(collection(db, 'friendships'), where('user1Id', '==', userId))),
    getDocs(query(collection(db, 'friendships'), where('user2Id', '==', userId))),
  ]);
  const results: Friendship[] = [];
  s1.docs.forEach((d) => results.push({ id: d.id, ...d.data() } as Friendship));
  s2.docs.forEach((d) => results.push({ id: d.id, ...d.data() } as Friendship));
  return results;
}

export function getFriendName(f: Friendship, myId: string): string {
  return f.user1Id === myId ? f.user2Name : f.user1Name;
}

export function getFriendId(f: Friendship, myId: string): string {
  return f.user1Id === myId ? f.user2Id : f.user1Id;
}
