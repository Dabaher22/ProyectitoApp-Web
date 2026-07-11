import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ExerciseConfig {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  sets: number;
  reps: number;
  rest: number;
  gifUrl?: string;
  coachNote?: string;
  supersetGroupId?: string;
  // Cardio entries use type: 'cardio' and durationMinutes; all other fields are optional/ignored
  type?: 'exercise' | 'cardio';
  durationMinutes?: number;
}

export interface Routine {
  id: string;
  coachId: string;
  name: string;
  type: string;
  days: string[];
  assignedTo: string[];
  previousAssignedTo: string[];
  exercises: ExerciseConfig[];
  createdAt: any;
  macrocycleId?: string;
}

export async function createRoutine(
  coachId: string,
  data: { name: string; type: string; days: string[]; exercises: ExerciseConfig[]; macrocycleId?: string }
): Promise<string> {
  const ref = await addDoc(collection(db, 'routines'), {
    ...data,
    coachId,
    assignedTo: [],
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getRoutinesByMacrocycle(macrocycleId: string): Promise<Routine[]> {
  const q = query(
    collection(db, 'routines'),
    where('macrocycleId', '==', macrocycleId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Routine));
}

export async function updateRoutineFull(
  routineId: string,
  data: { name: string; type: string; days: string[]; exercises: ExerciseConfig[] }
) {
  await updateDoc(doc(db, 'routines', routineId), data);
}

export async function updateRoutineExercises(routineId: string, exercises: ExerciseConfig[]) {
  await updateDoc(doc(db, 'routines', routineId), { exercises });
}

export async function getRoutinesByCoach(coachId: string): Promise<Routine[]> {
  const q = query(
    collection(db, 'routines'),
    where('coachId', '==', coachId)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Routine));
  // Sort client-side to avoid needing a Firestore composite index
  return docs.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

export async function getRoutinesByTrainee(traineeId: string): Promise<Routine[]> {
  const q = query(
    collection(db, 'routines'),
    where('assignedTo', 'array-contains', traineeId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Routine));
}

export async function getRoutineById(routineId: string): Promise<Routine | null> {
  const snap = await getDoc(doc(db, 'routines', routineId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Routine;
}

export async function assignRoutineToTrainee(routineId: string, traineeId: string) {
  const ref = doc(db, 'routines', routineId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current: string[] = snap.data().assignedTo ?? [];
  if (!current.includes(traineeId)) {
    await updateDoc(ref, { assignedTo: [...current, traineeId] });
  }
}

export async function unassignRoutineFromTrainee(routineId: string, traineeId: string) {
  const ref = doc(db, 'routines', routineId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current: string[] = snap.data().assignedTo ?? [];
  await updateDoc(ref, { assignedTo: current.filter((id) => id !== traineeId) });
}

export async function deleteRoutine(routineId: string) {
  await deleteDoc(doc(db, 'routines', routineId));
}

export async function getPreviousRoutinesByTrainee(traineeId: string): Promise<Routine[]> {
  const q = query(
    collection(db, 'routines'),
    where('previousAssignedTo', 'array-contains', traineeId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Routine));
}

/** @deprecated Los asesorados ahora pueden tener varias rutinas asignadas a la vez. Usa assignRoutineToTrainee/unassignRoutineFromTrainee. */
export async function replaceRoutineForTrainee(newRoutineId: string, traineeId: string): Promise<void> {
  const currentRoutines = await getRoutinesByTrainee(traineeId);
  for (const routine of currentRoutines) {
    if (routine.id === newRoutineId) continue;
    const ref = doc(db, 'routines', routine.id);
    const prev: string[] = routine.previousAssignedTo ?? [];
    await updateDoc(ref, {
      assignedTo: routine.assignedTo.filter((id) => id !== traineeId),
      previousAssignedTo: prev.includes(traineeId) ? prev : [...prev, traineeId],
    });
  }
  await assignRoutineToTrainee(newRoutineId, traineeId);
}
