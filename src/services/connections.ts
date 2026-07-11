import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Connection {
  id: string;
  coachId: string;
  coachName: string;
  traineeId: string;
  traineeName: string;
  status: 'active';
  createdAt: any;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createInvite(coachId: string, coachName: string): Promise<string> {
  const code = generateCode();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  await setDoc(doc(db, 'invites', code), {
    coachId,
    coachName,
    createdAt: serverTimestamp(),
    expiresAt: expiresAt.toISOString(),
  });

  return code;
}

export async function joinWithCode(
  code: string,
  traineeId: string,
  traineeName: string
): Promise<{ coachId: string; coachName: string }> {
  const ref = doc(db, 'invites', code.toUpperCase().trim());
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('Código inválido o expirado.');
  }

  const data = snap.data();

  if (new Date(data.expiresAt) < new Date()) {
    throw new Error('El código ha expirado. Pide al coach que genere uno nuevo.');
  }

  // Check if already connected
  const q = query(
    collection(db, 'connections'),
    where('coachId', '==', data.coachId),
    where('traineeId', '==', traineeId)
  );
  const existing = await getDocs(q);

  if (existing.empty) {
    await addDoc(collection(db, 'connections'), {
      coachId: data.coachId,
      coachName: data.coachName,
      traineeId,
      traineeName,
      status: 'active',
      createdAt: serverTimestamp(),
    });
  }

  return { coachId: data.coachId, coachName: data.coachName };
}

export async function getConnectionsByCoach(coachId: string): Promise<Connection[]> {
  const q = query(collection(db, 'connections'), where('coachId', '==', coachId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Connection));
}

export async function disconnectFromCoach(connectionId: string): Promise<void> {
  await deleteDoc(doc(db, 'connections', connectionId));
}

export async function getConnectionByTrainee(traineeId: string): Promise<Connection | null> {
  const q = query(collection(db, 'connections'), where('traineeId', '==', traineeId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Connection;
}

export function getMembershipDays(createdAt: any): number {
  const createdMs = createdAt?.toMillis?.() ?? 0;
  if (!createdMs) return 0;
  return Math.floor((Date.now() - createdMs) / (24 * 60 * 60 * 1000));
}
