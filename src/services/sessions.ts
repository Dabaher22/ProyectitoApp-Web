import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface SetLog {
  setNum: number;
  weight: string;
  reps: string;
  done: boolean;
}

export interface ExerciseLog {
  id: string;
  name: string;
  sets: SetLog[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  traineeId: string;
  routineId: string;
  routineName: string;
  dayName: string;
  startedAt: Timestamp | string;
  finishedAt?: Timestamp | string;
  durationSeconds: number;
  exercises: ExerciseLog[];
  notes?: string;
  weightUnit?: 'kg' | 'lb';
  title?: string;
}

export async function saveSession(
  data: Omit<WorkoutSession, 'id' | 'finishedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'workoutSessions'), {
    ...data,
    finishedAt: serverTimestamp(),
  });
  return ref.id;
}

export function sessionToMs(startedAt: any): number {
  if (!startedAt) return 0;
  if (typeof startedAt.toMillis === 'function') return startedAt.toMillis();
  if (typeof startedAt === 'string') return new Date(startedAt).getTime();
  return 0;
}

export async function getSessionsByTrainee(traineeId: string): Promise<WorkoutSession[]> {
  const q = query(collection(db, 'workoutSessions'), where('traineeId', '==', traineeId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as WorkoutSession))
    .sort((a, b) => sessionToMs(b.startedAt) - sessionToMs(a.startedAt));
}

export function formatSessionDate(startedAt: Timestamp | string | any): string {
  try {
    const date =
      startedAt && typeof startedAt.toDate === 'function'
        ? startedAt.toDate()
        : new Date(startedAt);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function timeAgo(startedAt: any): string {
  const ms = sessionToMs(startedAt);
  if (!ms) return '';
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 60) return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  if (days === 1) return 'ayer';
  return `hace ${days}d`;
}

export async function updateSession(
  sessionId: string,
  exercises: ExerciseLog[],
  weightUnit?: 'kg' | 'lb'
): Promise<void> {
  const data: any = { exercises };
  if (weightUnit !== undefined) data.weightUnit = weightUnit;
  await updateDoc(doc(db, 'workoutSessions', sessionId), data);
}

export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
  await updateDoc(doc(db, 'workoutSessions', sessionId), { title });
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}h ${rem}m`;
}

export function sessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce((acc, ex) =>
    acc + ex.sets.filter((s) => s.done).reduce((a, s) =>
      a + parseFloat(s.weight || '0') * parseInt(s.reps || '0'), 0), 0);
}
