import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface PendingCoach {
  uid: string;
  displayName: string;
  email: string;
}

export async function getPendingCoaches(): Promise<PendingCoach[]> {
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'pending_coach')));
  return snap.docs.map(d => ({
    uid: d.id,
    displayName: d.data().displayName ?? '',
    email: d.data().email ?? '',
  }));
}

export async function approveCoach(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role: 'coach' });
}

export async function getAdminUids(): Promise<string[]> {
  const snap = await getDocs(query(collection(db, 'users'), where('isAdmin', '==', true)));
  return snap.docs.map((d) => d.id);
}
