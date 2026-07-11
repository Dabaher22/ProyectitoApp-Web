import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface CircuitExercise {
  id: string;
  name: string;
  reps: number;
  muscle?: string;
}

export interface Circuit {
  id: string;
  coachId: string;
  name: string;
  format: 'amrap' | 'emom';
  timeLimitMinutes?: number;  // AMRAP: tiempo total
  totalMinutes?: number;      // EMOM: duración total
  exercises: CircuitExercise[];
  assignedTo: string[];
  createdAt: any;
}

export async function createCircuit(
  coachId: string,
  data: Omit<Circuit, 'id' | 'coachId' | 'assignedTo' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'circuits'), {
    ...data,
    coachId,
    assignedTo: [],
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCircuit(
  circuitId: string,
  data: Omit<Circuit, 'id' | 'coachId' | 'assignedTo' | 'createdAt'>
): Promise<void> {
  await updateDoc(doc(db, 'circuits', circuitId), data);
}

export async function getCircuitsByCoach(coachId: string): Promise<Circuit[]> {
  const q = query(collection(db, 'circuits'), where('coachId', '==', coachId));
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Circuit));
  return docs.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}

export async function getCircuitsByTrainee(traineeId: string): Promise<Circuit[]> {
  const q = query(collection(db, 'circuits'), where('assignedTo', 'array-contains', traineeId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Circuit));
}

export async function assignCircuitToTrainee(circuitId: string, traineeId: string): Promise<void> {
  const ref = doc(db, 'circuits', circuitId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current: string[] = snap.data().assignedTo ?? [];
  if (!current.includes(traineeId)) {
    await updateDoc(ref, { assignedTo: [...current, traineeId] });
  }
}

export async function unassignCircuitFromTrainee(circuitId: string, traineeId: string): Promise<void> {
  const ref = doc(db, 'circuits', circuitId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current: string[] = snap.data().assignedTo ?? [];
  await updateDoc(ref, { assignedTo: current.filter((id) => id !== traineeId) });
}

export async function deleteCircuit(circuitId: string): Promise<void> {
  await deleteDoc(doc(db, 'circuits', circuitId));
}
