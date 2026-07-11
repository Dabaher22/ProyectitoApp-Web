import { WorkoutSession, sessionToMs, formatDuration, formatSessionDate } from './sessions';

export interface ExerciseProgress {
  name: string;
  startDate: string;
  startReps: string;
  startWeight: string;
  latestDate: string;
  latestReps: string;
  latestWeight: string;
  deltaLabel: string;
}

export interface RoutineReport {
  routineId: string;
  routineName: string;
  exercises: ExerciseProgress[];
}

export interface TraineeReport {
  totalSessions: number;
  avgPerWeek: number;
  avgDurationLabel: string;
  periodLabel: string;
  routines: RoutineReport[];
}

function computeDeltaLabel(startReps: string, startWeight: string, latestReps: string, latestWeight: string): string {
  const w1 = parseFloat(startWeight) || 0;
  const w2 = parseFloat(latestWeight) || 0;
  const r1 = parseInt(startReps, 10) || 0;
  const r2 = parseInt(latestReps, 10) || 0;
  const deltaW = w2 - w1;
  const deltaR = r2 - r1;

  if (deltaW === 0 && deltaR === 0) return 'Sin cambio';

  const parts: string[] = [];
  if (deltaW !== 0) parts.push(`${deltaW > 0 ? '+' : ''}${deltaW.toFixed(1)} kg`);
  if (deltaR !== 0) parts.push(`${deltaR > 0 ? '+' : ''}${deltaR} reps`);
  return parts.join(', ');
}

function buildRoutineReport(routineId: string, routineName: string, sessions: WorkoutSession[]): RoutineReport {
  const sorted = [...sessions].sort((a, b) => sessionToMs(a.startedAt) - sessionToMs(b.startedAt));

  const exerciseIds = new Set<string>();
  for (const s of sorted) for (const ex of s.exercises) exerciseIds.add(ex.id);

  const exercises: ExerciseProgress[] = [];
  for (const exId of exerciseIds) {
    let first: { session: WorkoutSession; name: string; reps: string; weight: string } | null = null;
    let last: { session: WorkoutSession; name: string; reps: string; weight: string } | null = null;

    for (const s of sorted) {
      const ex = s.exercises.find((e) => e.id === exId);
      if (!ex) continue;
      const doneSet = ex.sets.find((set) => set.done);
      if (!doneSet) continue;
      const entry = { session: s, name: ex.name, reps: doneSet.reps, weight: doneSet.weight };
      if (!first) first = entry;
      last = entry;
    }

    if (!first || !last) continue;

    exercises.push({
      name: first.name,
      startDate: formatSessionDate(first.session.startedAt),
      startReps: first.reps,
      startWeight: first.weight,
      latestDate: formatSessionDate(last.session.startedAt),
      latestReps: last.reps,
      latestWeight: last.weight,
      deltaLabel: computeDeltaLabel(first.reps, first.weight, last.reps, last.weight),
    });
  }

  exercises.sort((a, b) => a.name.localeCompare(b.name));
  return { routineId, routineName, exercises };
}

export function buildTraineeReport(sessions: WorkoutSession[]): TraineeReport {
  const sorted = [...sessions].sort((a, b) => sessionToMs(a.startedAt) - sessionToMs(b.startedAt));

  const totalSessions = sorted.length;
  const totalDuration = sorted.reduce((acc, s) => acc + s.durationSeconds, 0);
  const avgDurationLabel = totalSessions > 0 ? formatDuration(Math.round(totalDuration / totalSessions)) : '—';

  let avgPerWeek = 0;
  let periodLabel = '—';
  if (totalSessions > 0) {
    const firstMs = sessionToMs(sorted[0].startedAt);
    const lastMs = sessionToMs(sorted[sorted.length - 1].startedAt);
    const weeksSpan = Math.max(1, (lastMs - firstMs) / (7 * 24 * 60 * 60 * 1000));
    avgPerWeek = totalSessions / weeksSpan;
    periodLabel = totalSessions === 1
      ? formatSessionDate(sorted[0].startedAt)
      : `${formatSessionDate(sorted[0].startedAt)} – ${formatSessionDate(sorted[sorted.length - 1].startedAt)}`;
  }

  const byRoutine = new Map<string, WorkoutSession[]>();
  for (const s of sorted) {
    if (!byRoutine.has(s.routineId)) byRoutine.set(s.routineId, []);
    byRoutine.get(s.routineId)!.push(s);
  }

  const routines: RoutineReport[] = [];
  for (const [routineId, routineSessions] of byRoutine) {
    const routineName = routineSessions[routineSessions.length - 1].routineName;
    routines.push(buildRoutineReport(routineId, routineName, routineSessions));
  }
  routines.sort((a, b) => a.routineName.localeCompare(b.routineName));

  return { totalSessions, avgPerWeek, avgDurationLabel, periodLabel, routines };
}
