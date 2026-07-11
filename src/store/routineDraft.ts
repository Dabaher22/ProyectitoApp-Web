export interface RoutineDraft {
  coachId: string;
  savedAt: number;
  step: 2 | 3;
  routineId: string;
  routineName: string;
  routineType: string;
  days: string[];
  dayConfigs: any[];
}

function draftKey(uid: string) { return `routine_draft_${uid}`; }

export function getRoutineDraft(uid: string): RoutineDraft | null {
  try {
    const d = JSON.parse(localStorage.getItem(draftKey(uid)) ?? 'null') as RoutineDraft | null;
    return d?.coachId === uid ? d : null;
  } catch { return null; }
}

export function saveRoutineDraft(uid: string, data: Omit<RoutineDraft, 'coachId' | 'savedAt'>) {
  try {
    localStorage.setItem(draftKey(uid), JSON.stringify({ ...data, coachId: uid, savedAt: Date.now() }));
  } catch {}
}

export function clearRoutineDraft(uid: string) {
  try { localStorage.removeItem(draftKey(uid)); } catch {}
}
