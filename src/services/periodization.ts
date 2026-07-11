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
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MacrocycleStatus = 'draft' | 'active' | 'completed';

export type MesocyclePhase =
  | 'hypertrophy'
  | 'strength'
  | 'deload'
  | 'peak'
  | 'base'
  | 'custom';

export interface MicrocycleEntry {
  weekNumber: number;
  routineId?: string;
  routineName?: string;
  focus?: string;
  notes?: string;
}

export interface Macrocycle {
  id: string;
  coachId: string;
  traineeId: string;
  traineeName: string;
  name: string;
  goal: string;
  durationWeeks: number;
  startDate: string;
  status: MacrocycleStatus;
  createdAt: any;
}

export interface Mesocycle {
  id: string;
  macrocycleId: string;
  coachId: string;
  traineeId: string;
  name: string;
  phase: MesocyclePhase;
  durationWeeks: number;
  order: number;
  notes: string;
  microcycles: MicrocycleEntry[];
  createdAt: any;
}

// ─── Macrocycle CRUD ──────────────────────────────────────────────────────────

export async function createMacrocycle(data: {
  coachId: string;
  traineeId: string;
  traineeName: string;
  name: string;
  goal: string;
  durationWeeks: number;
  startDate: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, 'macrocycles'), {
    ...data,
    status: 'draft' as MacrocycleStatus,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getMacrocyclesByCoach(coachId: string): Promise<Macrocycle[]> {
  const q = query(collection(db, 'macrocycles'), where('coachId', '==', coachId));
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Macrocycle));
  return docs.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

export async function getMacrocyclesByTrainee(traineeId: string): Promise<Macrocycle[]> {
  const q = query(collection(db, 'macrocycles'), where('traineeId', '==', traineeId));
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Macrocycle));
  return docs.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

export async function getMacrocycleById(id: string): Promise<Macrocycle | null> {
  const snap = await getDoc(doc(db, 'macrocycles', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Macrocycle;
}

export async function updateMacrocycle(
  id: string,
  data: Partial<Pick<Macrocycle, 'name' | 'goal' | 'durationWeeks' | 'startDate' | 'status'>>
): Promise<void> {
  await updateDoc(doc(db, 'macrocycles', id), data);
}

export async function deleteMacrocycle(id: string): Promise<void> {
  const mesos = await getMesocyclesByMacrocycle(id);
  await Promise.all(mesos.map((m) => deleteMesocycle(m.id)));
  await deleteDoc(doc(db, 'macrocycles', id));
}

// ─── Mesocycle CRUD ───────────────────────────────────────────────────────────

export async function createMesocycle(data: {
  macrocycleId: string;
  coachId: string;
  traineeId: string;
  name: string;
  phase: MesocyclePhase;
  durationWeeks: number;
  order: number;
  notes: string;
}): Promise<string> {
  const microcycles: MicrocycleEntry[] = Array.from(
    { length: data.durationWeeks },
    (_, i) => ({ weekNumber: i + 1 })
  );
  const ref = await addDoc(collection(db, 'mesocycles'), {
    ...data,
    microcycles,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getMesocyclesByMacrocycle(macrocycleId: string): Promise<Mesocycle[]> {
  const q = query(collection(db, 'mesocycles'), where('macrocycleId', '==', macrocycleId));
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Mesocycle));
  return docs.sort((a, b) => a.order - b.order);
}

export async function getMesocyclesByTrainee(traineeId: string): Promise<Mesocycle[]> {
  const q = query(collection(db, 'mesocycles'), where('traineeId', '==', traineeId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Mesocycle));
}

export async function getMesocycleById(id: string): Promise<Mesocycle | null> {
  const snap = await getDoc(doc(db, 'mesocycles', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Mesocycle;
}

export async function updateMesocycle(
  id: string,
  data: Partial<Pick<Mesocycle, 'name' | 'phase' | 'durationWeeks' | 'order' | 'notes' | 'microcycles'>>
): Promise<void> {
  await updateDoc(doc(db, 'mesocycles', id), data);
}

export async function updateMicrocycleEntry(
  mesocycleId: string,
  weekNumber: number,
  entry: Partial<Omit<MicrocycleEntry, 'weekNumber'>>
): Promise<void> {
  const meso = await getMesocycleById(mesocycleId);
  if (!meso) return;
  const microcycles = meso.microcycles.map((m) => {
    if (m.weekNumber !== weekNumber) return m;
    const merged = { ...m, ...entry };
    // Firestore no acepta undefined — eliminar antes de escribir
    return Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== undefined));
  });
  await updateDoc(doc(db, 'mesocycles', mesocycleId), { microcycles });
}

export async function deleteMesocycle(id: string): Promise<void> {
  await deleteDoc(doc(db, 'mesocycles', id));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const PHASE_LABELS: Record<MesocyclePhase, string> = {
  hypertrophy: 'Hipertrofia',
  strength: 'Fuerza',
  deload: 'Descarga',
  peak: 'Peak',
  base: 'Base',
  custom: 'Personalizado',
};

export const PHASE_COLORS: Record<MesocyclePhase, string> = {
  hypertrophy: '#FF6B35',
  strength: '#00D4AA',
  deload: '#777777',
  peak: '#FFB347',
  base: '#6B9FFF',
  custom: '#B980FF',
};

export function getActiveMacrocycle(macrocycles: Macrocycle[]): Macrocycle | null {
  return macrocycles.find((m) => m.status === 'active') ?? null;
}

export function getCurrentMesocycle(
  mesocycles: Mesocycle[],
  macrocycle: Macrocycle
): Mesocycle | null {
  if (mesocycles.length === 0 || !macrocycle.startDate) return null;
  const startMs = new Date(macrocycle.startDate).getTime();
  const nowMs = Date.now();
  const elapsedWeeks = Math.floor((nowMs - startMs) / (7 * 24 * 60 * 60 * 1000));

  let weekCursor = 0;
  for (const meso of mesocycles) {
    weekCursor += meso.durationWeeks;
    if (elapsedWeeks < weekCursor) return meso;
  }
  return mesocycles[mesocycles.length - 1] ?? null;
}

export function getCurrentMicrocycle(
  mesocycle: Mesocycle,
  macrocycle: Macrocycle
): MicrocycleEntry | null {
  if (!macrocycle.startDate) return mesocycle.microcycles[0] ?? null;
  const startMs = new Date(macrocycle.startDate).getTime();
  const elapsedWeeks = Math.floor((Date.now() - startMs) / (7 * 24 * 60 * 60 * 1000));
  const index = Math.max(0, Math.min(elapsedWeeks, mesocycle.durationWeeks - 1));
  return mesocycle.microcycles[index] ?? null;
}

export function getWeeksRemaining(macrocycle: Macrocycle): number {
  if (!macrocycle.startDate) return macrocycle.durationWeeks;
  const startMs = new Date(macrocycle.startDate).getTime();
  const endMs = startMs + macrocycle.durationWeeks * 7 * 24 * 60 * 60 * 1000;
  const remaining = Math.ceil((endMs - Date.now()) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(0, remaining);
}

export function getMacrocycleProgress(macrocycle: Macrocycle): number {
  if (!macrocycle.startDate || macrocycle.durationWeeks === 0) return 0;
  const startMs = new Date(macrocycle.startDate).getTime();
  const elapsed = Date.now() - startMs;
  const total = macrocycle.durationWeeks * 7 * 24 * 60 * 60 * 1000;
  return Math.min(1, Math.max(0, elapsed / total));
}
