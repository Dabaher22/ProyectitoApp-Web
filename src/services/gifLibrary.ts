import {
  collection, getDocs, getDoc, doc, setDoc, writeBatch,
  deleteDoc, updateDoc, query, where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { GIF_LIBRARY, GIF_MUSCLES } from '../data/gifLibrary';

export interface GifMeta {
  id: string;
  muscle: string;
  url: string;
  name: string;
  order: number;
}

const COL = 'gifMeta';
let _cache: GifMeta[] | null = null;
let _missingCount: number = 0;

export function invalidateGifCache() { _cache = null; _missingCount = 0; }

/** True when all static GIFs are already in Firestore */
export function gifLibraryIsSeeded(): boolean { return _missingCount === 0 && _cache !== null; }

export async function getGifLibrary(): Promise<GifMeta[]> {
  if (_cache) return _cache;
  const snap = await getDocs(collection(db, COL));

  // Build map of Firestore docs
  const fsMap = new Map<string, GifMeta>();
  snap.docs.forEach(d => fsMap.set(d.id, d.data() as GifMeta));

  // Merge: prefer Firestore data, fallback to static for missing docs
  const merged: GifMeta[] = GIF_LIBRARY.map((g, i) => {
    const fs = fsMap.get(g.id);
    return fs ?? { id: g.id, muscle: g.muscle, url: g.url, name: '', order: i };
  });

  // Append any custom GIFs (not in static library)
  snap.docs.forEach(d => {
    const data = d.data() as GifMeta;
    if (!GIF_LIBRARY.find(g => g.id === data.id)) merged.push(data);
  });

  _missingCount = GIF_LIBRARY.filter(g => !fsMap.has(g.id)).length;
  _cache = merged.sort((a, b) => a.muscle.localeCompare(b.muscle) || a.order - b.order);
  return _cache;
}

/** Seeds Firestore with all static GIFs that are not yet in Firestore. Preserves edited docs. */
export async function seedIfEmpty(): Promise<boolean> {
  const snap = await getDocs(collection(db, COL));
  const existingIds = new Set(snap.docs.map(d => d.id));
  const missing = GIF_LIBRARY.filter(g => !existingIds.has(g.id));
  if (missing.length === 0) return false;

  const items: GifMeta[] = missing.map((g, i) => ({
    id: g.id, muscle: g.muscle, url: g.url, name: '', order: existingIds.size + i,
  }));

  const CHUNK = 490;
  for (let i = 0; i < items.length; i += CHUNK) {
    const batch = writeBatch(db);
    items.slice(i, i + CHUNK).forEach(item => {
      batch.set(doc(db, COL, item.id), item);
    });
    await batch.commit();
  }
  invalidateGifCache();
  return true;
}

export async function addGif(gif: Omit<GifMeta, 'order'>): Promise<void> {
  const snap = await getDocs(
    query(collection(db, COL), where('muscle', '==', gif.muscle))
  );
  const maxOrder = snap.docs.reduce((m, d) => Math.max(m, d.data().order ?? 0), -1);
  await setDoc(doc(db, COL, gif.id), { ...gif, order: maxOrder + 1 });
  invalidateGifCache();
}

export async function updateGif(gif: GifMeta): Promise<void> {
  await setDoc(doc(db, COL, gif.id), gif);
  invalidateGifCache();
}

export async function deleteGif(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
  invalidateGifCache();
}

export async function swapGifOrder(
  id1: string, order1: number,
  id2: string, order2: number,
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, COL, id1), { order: order2 });
  batch.update(doc(db, COL, id2), { order: order1 });
  await batch.commit();
  invalidateGifCache();
}

// ── Muscle groups (dynamic list stored in Firestore) ──────────────────────────

export async function getMuscleGroups(): Promise<string[]> {
  try {
    const snap = await getDoc(doc(db, 'config', 'muscleGroups'));
    if (snap.exists() && Array.isArray(snap.data().groups)) {
      return snap.data().groups as string[];
    }
  } catch {}
  return [...GIF_MUSCLES];
}

export async function saveMuscleGroups(groups: string[]): Promise<void> {
  await setDoc(doc(db, 'config', 'muscleGroups'), { groups });
}
