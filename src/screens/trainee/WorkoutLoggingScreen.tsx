import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, Clock, Dumbbell, History, ArrowLeft, X, Timer, ArrowRight, List, FileText, Film, Pencil, CornerDownRight } from 'lucide-react';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { saveSession, updateSessionTitle, SetLog, getSessionsByTrainee, WorkoutSession, formatSessionDate } from '../../services/sessions';
import { useAuthStore } from '../../store/authStore';

interface ExLog {
  id: string;
  name: string;
  muscle: string;
  targetSets: number;
  targetReps: number;
  rest: number;
  sets: SetLog[];
  gifUrl?: string;
  coachNote?: string;
  supersetGroupId?: string;
  type?: 'exercise' | 'cardio';
  durationMinutes?: number;
}

interface WorkoutDraft {
  traineeId: string;
  routineId: string;
  routineName: string;
  dayName: string;
  startEpoch: number;
  seconds: number;
  currentExIdx: number;
  currentSetNum: number;
  repsValue: string;
  kgValue: string;
  logs: ExLog[];
  exNotes: Record<string, string>;
}

type Step = 'pick-day' | 'logging';
type LoggingView = 'active' | 'ejercicio-completado' | 'ver-rutina';

export default function WorkoutLoggingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const uid = useAuthStore((s) => s.uid)!;

  const draftKey = `workout_draft_${uid}`;

  // ── Leer borrador si viene con resumeDraft ──
  const isResume = !!(location.state as any)?.resumeDraft;
  const draft: WorkoutDraft | null = isResume ? (() => {
    try { return JSON.parse(localStorage.getItem(draftKey) ?? 'null') as WorkoutDraft | null; }
    catch { return null; }
  })() : null;

  const state = location.state as {
    routineId: string;
    routineName: string;
    allExercises?: any[];
    days?: string[];
    startDay?: string;
    exercises?: any[];
    dayName?: string;
  } | null;

  const { routineId = draft?.routineId ?? '', routineName = draft?.routineName ?? '' } = state ?? {};
  const allExercises = state?.allExercises ?? state?.exercises ?? [];
  const allDays = state?.days ?? (state?.dayName ? [state.dayName] : []);
  const initialDay = state?.startDay ?? state?.dayName ?? '';

  function buildLogs(exs: any[]): ExLog[] {
    return exs.map((e) => {
      if (e.type === 'cardio') {
        return {
          id: e.id, name: e.name, muscle: '',
          targetSets: 1, targetReps: 0,
          rest: 0, type: 'cardio' as const,
          durationMinutes: e.durationMinutes ?? 0,
          sets: [{ setNum: 1, weight: '', reps: String(e.durationMinutes ?? 0) + 'min', done: false }],
        };
      }
      return {
        id: e.id, name: e.name, muscle: e.muscle ?? '',
        targetSets: e.sets, targetReps: e.reps,
        rest: e.rest ?? 0,
        gifUrl: e.gifUrl,
        coachNote: e.coachNote,
        supersetGroupId: e.supersetGroupId,
        sets: Array.from({ length: e.sets }, (_, i) => ({ setNum: i + 1, weight: '', reps: '', done: false })),
      };
    });
  }

  const [step, setStep] = useState<Step>(draft ? 'logging' : (initialDay ? 'logging' : 'pick-day'));
  const [selectedDay, setSelectedDay] = useState(draft?.dayName ?? initialDay);
  const [logs, setLogs] = useState<ExLog[]>(() => {
    if (draft) return draft.logs;
    if (!initialDay) return [];
    return buildLogs(allExercises.filter((e) => (e.day ?? allDays[0]) === initialDay));
  });

  const [currentExIdx, setCurrentExIdx] = useState(draft?.currentExIdx ?? 0);
  const [currentSetNum, setCurrentSetNum] = useState(draft?.currentSetNum ?? 1);
  const [repsValue, setRepsValue] = useState(draft?.repsValue ?? '');
  const [kgValue, setKgValue] = useState(draft?.kgValue ?? '');
  const [repsValue2, setRepsValue2] = useState('');
  const [kgValue2, setKgValue2] = useState('');
  const [repsValue3, setRepsValue3] = useState('');
  const [kgValue3, setKgValue3] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>(() =>
    (localStorage.getItem('weight_unit') as 'kg' | 'lb') ?? 'kg'
  );
  const toggleWeightUnit = () => setWeightUnit((u) => {
    const next = u === 'kg' ? 'lb' : 'kg';
    localStorage.setItem('weight_unit', next);
    return next;
  });

  // Cardio countdown
  const [cardioSecsLeft, setCardioSecsLeft] = useState(0);
  const [cardioRunning, setCardioRunning] = useState(false);

  // Celebration & rest
  const [loggingView, setLoggingView] = useState<LoggingView>('active');
  const [celebVisible, setCelebVisible] = useState(false);
  const [lastReps, setLastReps] = useState('');
  const [lastKg, setLastKg] = useState('');
  const [restSecsLeft, setRestSecsLeft] = useState(0);
  const [isResting, setIsResting] = useState(false);

  // Workout timer (timestamp-based so it works in background)
  const [seconds, setSeconds] = useState(() =>
    draft ? Math.floor((Date.now() - (draft.startEpoch ?? Date.now() - draft.seconds * 1000)) / 1000) : 0
  );
  const [timerActive, setTimerActive] = useState(!!(draft || initialDay));
  const startEpochRef = useRef<number>(draft?.startEpoch ?? Date.now());
  const [saving, setSaving] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [prevData, setPrevData] = useState<Map<string, SetLog[]>>(new Map());

  // Per-exercise notes
  const exNotesRef = useRef<Map<string, string>>(
    draft?.exNotes ? new Map(Object.entries(draft.exNotes)) : new Map()
  );
  const [prevExNotesMap, setPrevExNotesMap] = useState<Map<string, string>>(new Map());
  const [currentExNotes, setCurrentExNotes] = useState('');
  const [gifSource, setGifSource] = useState<'current' | 'partner' | 'partner2' | null>(null);
  const [editingSet, setEditingSet] = useState<{ exIdx: number; setNum: number; reps: string; weight: string } | null>(null);
  const [jumpConfirmIdx, setJumpConfirmIdx] = useState<number | null>(null);
  // Set completion flash toast
  const [flashSetNum, setFlashSetNum] = useState<number | null>(null);
  const [exAnimKey, setExAnimKey] = useState(0);
  // Tracks last kg and reps used per exercise in this session
  const sessionWeightsRef = useRef<Map<string, string>>(new Map());
  const sessionRepsRef = useRef<Map<string, string>>(new Map());

  // Keep advance function fresh to avoid stale closures in effects
  const advanceRef = useRef<() => void>(() => {});

  // ── Auto-guardar borrador en localStorage ──
  useEffect(() => {
    if (step !== 'logging' || !selectedDay) return;
    const d: WorkoutDraft = {
      traineeId: uid,
      routineId,
      routineName,
      dayName: selectedDay,
      startEpoch: startEpochRef.current,
      seconds: Math.floor((Date.now() - startEpochRef.current) / 1000),
      currentExIdx,
      currentSetNum,
      repsValue,
      kgValue,
      logs,
      exNotes: Object.fromEntries(exNotesRef.current),
    };
    try { localStorage.setItem(draftKey, JSON.stringify(d)); } catch {}
  }, [logs, currentExIdx, currentSetNum, repsValue, kgValue]);

  const clearDraft = () => { try { localStorage.removeItem(draftKey); } catch {} };

  // Load recent sessions
  useEffect(() => {
    if (!uid) return;
    const day = draft?.dayName ?? initialDay;
    const rid = draft?.routineId ?? routineId;
    getSessionsByTrainee(uid)
      .then((sessions) => {
        setRecentSessions(sessions);
        if (day) {
          const last = sessions.find((s) => s.routineId === rid && s.dayName === day);
          if (last) { setPrevData(buildPrevMap(last)); setPrevExNotesMap(buildPrevExNotes(last)); }
        }
      })
      .catch((err) => console.error('Error cargando sesiones previas:', err))
      .finally(() => setSessionsLoaded(true));
  }, [uid]);

  function buildPrevMap(session: WorkoutSession): Map<string, SetLog[]> {
    const map = new Map<string, SetLog[]>();
    for (const ex of session.exercises) map.set(ex.id, ex.sets);
    return map;
  }

  function buildPrevExNotes(session: WorkoutSession): Map<string, string> {
    const map = new Map<string, string>();
    for (const ex of session.exercises) { if (ex.notes) map.set(ex.id, ex.notes); }
    return map;
  }

  // Sync notes textarea when exercise changes
  useEffect(() => {
    if (step !== 'logging' || logs.length === 0) return;
    const ex = logs[currentExIdx];
    if (!ex) return;
    setCurrentExNotes(exNotesRef.current.get(ex.id) ?? '');
  }, [currentExIdx, step]);

  // Pre-fill inputs when exercise/set changes
  useEffect(() => {
    if (logs.length === 0 || step !== 'logging') return;
    const ex = logs[currentExIdx];
    if (!ex) return;
    const prevSet = prevData.get(ex.id)?.find((s) => s.setNum === currentSetNum);
    const sessionReps = sessionRepsRef.current.get(ex.id);
    setRepsValue(sessionReps !== undefined ? sessionReps : (prevSet?.reps || ''));
    const sessionKg = sessionWeightsRef.current.get(ex.id);
    setKgValue(sessionKg !== undefined ? sessionKg : (prevSet?.weight || ''));
    // Súper-serie (bi-serie/tri-serie): pre-llenar a los compañeros del mismo supersetGroupId
    const fillPartner = (partner: ExLog | undefined, setReps: (v: string) => void, setKg: (v: string) => void) => {
      if (ex.supersetGroupId && partner?.supersetGroupId === ex.supersetGroupId) {
        const prevSetP = prevData.get(partner.id)?.find((s) => s.setNum === currentSetNum);
        setReps(sessionRepsRef.current.get(partner.id) ?? prevSetP?.reps ?? '');
        setKg(sessionWeightsRef.current.get(partner.id) ?? prevSetP?.weight ?? '');
        return true;
      }
      setReps('');
      setKg('');
      return false;
    };
    const hasPartner2 = fillPartner(logs[currentExIdx + 1], setRepsValue2, setKgValue2);
    fillPartner(hasPartner2 ? logs[currentExIdx + 2] : undefined, setRepsValue3, setKgValue3);
  }, [currentExIdx, currentSetNum, prevData, step]);

  // Auto-start cardio countdown when current exercise is cardio
  useEffect(() => {
    if (step !== 'logging' || logs.length === 0) return;
    const ex = logs[currentExIdx];
    if (ex?.type === 'cardio' && !cardioRunning && cardioSecsLeft === 0) {
      startCardio(ex.durationMinutes ?? 0);
    }
  }, [currentExIdx, step, logs.length]);

  // Workout timer
  useEffect(() => {
    if (!timerActive) return;
    startEpochRef.current = Date.now() - seconds * 1000;
    const tick = () => setSeconds(Math.floor((Date.now() - startEpochRef.current) / 1000));
    const id = setInterval(tick, 1000);
    const onVisibility = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisibility); };
  }, [timerActive]);

  // Rest countdown
  useEffect(() => {
    if (restSecsLeft <= 0) return;
    const t = setTimeout(() => setRestSecsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [restSecsLeft]);

  // Auto-advance when rest finishes
  useEffect(() => {
    if (!isResting || restSecsLeft > 0) return;
    setIsResting(false);
    advanceRef.current();
  }, [isResting, restSecsLeft]);

  // Cardio countdown
  useEffect(() => {
    if (!cardioRunning || cardioSecsLeft <= 0) return;
    const t = setTimeout(() => setCardioSecsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cardioRunning, cardioSecsLeft]);

  // Auto-complete cardio when timer reaches 0
  useEffect(() => {
    if (!cardioRunning || cardioSecsLeft > 0) return;
    setCardioRunning(false);
    completeCardio();
  }, [cardioRunning, cardioSecsLeft]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Start cardio countdown when we land on a cardio exercise
  const startCardio = (durationMinutes: number) => {
    setCardioSecsLeft(durationMinutes * 60);
    setCardioRunning(true);
  };

  const completeCardio = () => {
    const ex = logs[currentExIdx];
    if (!ex) return;
    const updated = logs.map((l, i) =>
      i === currentExIdx ? { ...l, sets: [{ setNum: 1, weight: '', reps: String(l.durationMinutes ?? 0) + 'min', done: true }] } : l
    );
    setLogs(updated);
    setCardioRunning(false);
    setCardioSecsLeft(0);
    const nextIdx = currentExIdx + 1;
    if (nextIdx < logs.length) {
      setCurrentExIdx(nextIdx);
      setCurrentSetNum(1);
      setExAnimKey((k) => k + 1);
      setLoggingView('active');
    } else {
      doSave(updated);
    }
  };

  // Advance after completing an exercise: finds the first pending exercise in original order
  // This handles skip/jump flows so the athlete always returns to pending exercises in order
  const advanceToNextSet = () => {
    if (!logs[currentExIdx]) return;
    const nextPendingIdx = logs.findIndex((l, i) => i !== currentExIdx && l.sets.some(s => !s.done));
    if (nextPendingIdx !== -1) {
      const firstUndoneSetNum = logs[nextPendingIdx].sets.find(s => !s.done)?.setNum ?? 1;
      setCurrentExIdx(nextPendingIdx);
      setCurrentSetNum(firstUndoneSetNum);
      setExAnimKey((k) => k + 1);
      setLoggingView('active');
    } else {
      doSave(logs);
    }
  };
  advanceRef.current = advanceToNextSet;

  const handleCompleteSet = () => {
    if (!currentEx) return;
    const isLastSet = currentSetNum >= (currentEx.targetSets ?? 1);

    // Súper-serie (bi-serie/tri-serie): agrupa todos los ejercicios consecutivos con el mismo supersetGroupId
    let groupLen = 1;
    if (currentEx.supersetGroupId) {
      while (logs[currentExIdx + groupLen]?.supersetGroupId === currentEx.supersetGroupId) groupLen++;
    }
    const members = logs.slice(currentExIdx, currentExIdx + groupLen);
    const repsInputs = [repsValue, repsValue2, repsValue3];
    const kgInputs = [kgValue, kgValue2, kgValue3];
    const resolved = members.map((member, idx) => ({
      member,
      reps: repsInputs[idx] || String(member.targetReps ?? ''),
      kg: kgInputs[idx] || '0',
    }));

    const updated = logs.map((ex, i) => {
      const memberIdx = i - currentExIdx;
      if (memberIdx < 0 || memberIdx >= groupLen) return ex;
      const { reps, kg } = resolved[memberIdx];
      return { ...ex, sets: ex.sets.map((s) => s.setNum === currentSetNum ? { ...s, weight: kg, reps, done: true } : s) };
    });
    setLogs(updated);

    for (const { member, reps, kg } of resolved) {
      sessionWeightsRef.current.set(member.id, kg);
      sessionRepsRef.current.set(member.id, reps);
    }
    setLastReps(resolved[0].reps);
    setLastKg(resolved[0].kg);

    if (isLastSet) {
      setCelebVisible(false);
      setLoggingView('ejercicio-completado');
      requestAnimationFrame(() => requestAnimationFrame(() => setCelebVisible(true)));
    } else {
      setFlashSetNum(currentSetNum);
      setTimeout(() => setFlashSetNum(null), 1100);
      setCurrentSetNum(currentSetNum + 1);
    }
  };

  const handleSelectDay = (dayName: string) => {
    const exs = allExercises.filter((e) => (e.day ?? allDays[0]) === dayName);
    const last = recentSessions.find((s) => s.routineId === routineId && s.dayName === dayName);
    setPrevData(last ? buildPrevMap(last) : new Map());
    setPrevExNotesMap(last ? buildPrevExNotes(last) : new Map());
    sessionWeightsRef.current = new Map();
    sessionRepsRef.current = new Map();
    exNotesRef.current = new Map();
    setCurrentExNotes('');
    setLogs(buildLogs(exs));
    setSelectedDay(dayName);
    setCurrentExIdx(0);
    setCurrentSetNum(1);
    setTimerActive(true);
    setStep('logging');
  };

  const doSave = async (finalLogs: ExLog[]) => {
    setSaving(true);
    try {
      const id = await saveSession({
        traineeId: uid, routineId: routineId || draft?.routineId || '', routineName: routineName || draft?.routineName || '', dayName: selectedDay,
        startedAt: new Date().toISOString(), durationSeconds: seconds, weightUnit,
        exercises: finalLogs.map((ex) => {
          const n = exNotesRef.current.get(ex.id)?.trim();
          return { id: ex.id, name: ex.name, sets: ex.sets, ...(n ? { notes: n } : {}) };
        }),
      });
      clearDraft();
      setSavedSessionId(id);
      setWorkoutTitle('');
      setShowTitleModal(true);
    } catch { alert('No se pudo guardar la sesión.'); }
    finally { setSaving(false); }
  };

  const handleSaveAndExit = async () => {
    setShowExitModal(false);
    setSaving(true);
    try {
      const id = await saveSession({
        traineeId: uid, routineId: routineId || draft?.routineId || '', routineName: routineName || draft?.routineName || '', dayName: selectedDay,
        startedAt: new Date().toISOString(), durationSeconds: seconds, weightUnit,
        exercises: logs.map((ex) => {
          const n = exNotesRef.current.get(ex.id)?.trim();
          return { id: ex.id, name: ex.name, sets: ex.sets, ...(n ? { notes: n } : {}) };
        }),
      });
      clearDraft();
      setSavedSessionId(id);
      setWorkoutTitle('');
      setShowTitleModal(true);
    } catch { alert('No se pudo guardar la sesión.'); }
    finally { setSaving(false); }
  };

  const handleFinishWithTitle = async () => {
    const title = workoutTitle.trim();
    if (savedSessionId && title) {
      try {
        await updateSessionTitle(savedSessionId, title);
      } catch (err) {
        alert('No se pudo guardar el título. Verifica tu conexión.');
        return;
      }
    }
    navigate(-1);
  };

  /* ─── Title modal (after save) ─────────────────────── */
  if (showTitleModal) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: Colors.bgPage, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg }}>
        <div style={{ width: '100%', maxWidth: 420, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Spacing.sm }}>
            <div style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.teal + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check color={Colors.teal} size={26} />
            </div>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.white }}>¡ENTRENAMIENTO GUARDADO!</span>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, textAlign: 'center' }}>¿Le pones un nombre a este entrenamiento? Aparecerá en el feed de tus amigos.</span>
          </div>
          <input
            autoFocus
            value={workoutTitle}
            onChange={(e) => setWorkoutTitle(e.target.value)}
            placeholder="Ej: Pecho y espalda brutal..."
            maxLength={50}
            onKeyDown={(e) => e.key === 'Enter' && handleFinishWithTitle()}
            style={{
              width: '100%', height: 50, backgroundColor: Colors.bgElevated, borderRadius: Radius.md,
              textAlign: 'center', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 14,
              color: Colors.white, border: `1px solid ${Colors.teal}40`, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            <button onClick={handleFinishWithTitle} style={{
              height: 50, backgroundColor: Colors.teal, borderRadius: Radius.md, border: 'none', cursor: 'pointer',
              fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.blackText,
            }}>
              {workoutTitle.trim() ? 'GUARDAR TÍTULO' : 'CONTINUAR SIN TÍTULO'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Step: Day picker ─────────────────────────────── */
  if (step === 'pick-day') {
    const lastForRoutine = recentSessions.find((s) => s.routineId === routineId) ?? null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: Colors.bgPage }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: `${Spacing.md}px ${Spacing.lg}px`, paddingTop: 'calc(16px + env(safe-area-inset-top))' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <ArrowLeft color={Colors.white} size={22} />
          </button>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 600, fontSize: 18, color: Colors.white }}>ENTRENAR</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: `0 ${Spacing.lg}px ${Spacing.lg}px`, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
          <div>
            <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 22, color: Colors.white, letterSpacing: 1 }}>¿QUÉ VAS A ENTRENAR?</div>
            <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, marginTop: 4, letterSpacing: 0.5 }}>{routineName.toUpperCase()}</div>
          </div>
          {lastForRoutine && (
            <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, border: `1px solid ${Colors.bgElevated}` }}>
              <div style={{ width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.teal + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock color={Colors.teal} size={16} />
              </div>
              <div>
                <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>ÚLTIMA VEZ</div>
                <div style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.white, marginTop: 2 }}>{lastForRoutine.dayName}</div>
                <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>{formatSessionDate(lastForRoutine.startedAt)}</div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, letterSpacing: 0.5 }}>SELECCIONA EL DÍA</span>
            {allDays.map((dayName) => {
              const exCount = allExercises.filter((e) => (e.day ?? allDays[0]) === dayName).length;
              const wasLast = lastForRoutine?.dayName === dayName;
              return (
                <button key={dayName} onClick={() => handleSelectDay(dayName)} disabled={!sessionsLoaded} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
                  border: `1px solid ${wasLast ? Colors.teal + '50' : Colors.bgElevated}`,
                  cursor: sessionsLoaded ? 'pointer' : 'default', opacity: sessionsLoaded ? 1 : 0.6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.md }}>
                    <div style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.teal + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Dumbbell color={Colors.teal} size={18} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white, textTransform: 'uppercase' }}>{dayName}</div>
                      <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>{exCount} ejercicios</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 14, color: Colors.teal }}>{sessionsLoaded ? '→' : '···'}</span>
                    {wasLast && <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.teal, letterSpacing: 0.3 }}>ÚLTIMA VEZ</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const currentEx = logs[currentExIdx];
  const groupSize = (() => {
    if (!currentEx?.supersetGroupId) return 1;
    let n = 1;
    while (logs[currentExIdx + n]?.supersetGroupId === currentEx.supersetGroupId) n++;
    return n;
  })();
  const groupMembers = logs.slice(currentExIdx, currentExIdx + groupSize);
  const nextEx = logs[currentExIdx + groupSize] ?? null;
  const prevSetData = prevData.get(currentEx?.id ?? '')?.find((s) => s.setNum === currentSetNum);
  const completedSetsInEx = logs[currentExIdx]?.sets.filter((s) => s.done).length ?? 0;

  /* ─── View: Cardio countdown ───────────────────────────── */
  if (currentEx?.type === 'cardio') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: Colors.bgPage }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${Spacing.md}px ${Spacing.lg}px`, paddingTop: 'calc(16px + env(safe-area-inset-top))' }}>
          <button onClick={() => setShowExitModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <ArrowLeft color={Colors.white} size={22} />
          </button>
          <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.gray }}>{formatTime(seconds)}</span>
          <div style={{ width: 22 }} />
        </div>

        {/* Main cardio content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.lg }}>
          {/* Progress */}
          <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, letterSpacing: 0.5 }}>
            EJERCICIO {currentExIdx + 1} DE {logs.length}
          </span>
          {/* Timer circle */}
          <div style={{ width: 180, height: 180, borderRadius: 90, backgroundColor: Colors.teal + '15', border: `3px solid ${Colors.teal}40`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Timer color={Colors.teal} size={32} />
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 40, color: Colors.teal, letterSpacing: 2 }}>
              {formatTime(cardioSecsLeft)}
            </span>
          </div>
          {/* Activity name */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 26, color: Colors.white, textTransform: 'uppercase', letterSpacing: 1 }}>{currentEx.name}</div>
            <div style={{ fontFamily: Fonts.mono, fontSize: 13, color: Colors.gray, marginTop: 4 }}>{currentEx.durationMinutes} minutos</div>
          </div>
          {/* Coach note */}
          {currentEx.coachNote && (
            <div style={{ backgroundColor: Colors.orange + '15', border: `1px solid ${Colors.orange}30`, borderRadius: Radius.md, padding: Spacing.md, maxWidth: 340, width: '100%' }}>
              <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.orange, lineHeight: 1.6 }}>{currentEx.coachNote}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.sm, paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
          <button onClick={completeCardio} style={{ height: 56, backgroundColor: Colors.teal, borderRadius: Radius.lg, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.blackText, letterSpacing: 1 }}>
            COMPLETAR CARDIO ✓
          </button>
          <button onClick={() => { setCardioRunning((r) => !r); }} style={{ height: 40, backgroundColor: 'transparent', borderRadius: Radius.lg, border: `1px solid ${Colors.bgElevated}`, cursor: 'pointer', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.gray }}>
            {cardioRunning ? '⏸ PAUSAR TIMER' : '▶ REANUDAR TIMER'}
          </button>
        </div>

        {/* Exit modal */}
        {showExitModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
            <div style={{ width: '100%', backgroundColor: Colors.bgCard, borderRadius: '20px 20px 0 0', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.white }}>¿SALIR DEL ENTRENAMIENTO?</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <button onClick={() => { setShowExitModal(false); doSave(logs); }} style={{ height: 52, borderRadius: Radius.lg, backgroundColor: Colors.teal, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.blackText }}>GUARDAR Y SALIR</button>
                <button onClick={() => { clearDraft(); navigate(-1); }} style={{ height: 52, borderRadius: Radius.lg, backgroundColor: Colors.bgElevated, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.gray }}>SALIR SIN GUARDAR</button>
                <button onClick={() => setShowExitModal(false)} style={{ height: 52, borderRadius: Radius.lg, backgroundColor: 'transparent', border: `1px solid ${Colors.bgElevated}`, cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white }}>CONTINUAR</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── View: Ejercicio completado (orange celebration) ─── */
  if (loggingView === 'ejercicio-completado') {
    const restSecs = currentEx?.rest > 0 ? currentEx.rest : 90;
    const isLastExercise = currentExIdx >= logs.length - 1;
    const isAllDone = isLastExercise;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: Colors.orange, opacity: celebVisible ? 1 : 0, transition: 'opacity 0.35s ease' }}>
        {/* Timer badge top right */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '52px 24px 0', paddingTop: 'calc(52px + env(safe-area-inset-top))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 16, padding: '6px 12px' }}>
            <Clock color={Colors.white} size={14} />
            <span style={{ fontFamily: Fonts.mono, fontWeight: 600, fontSize: 12, color: Colors.white }}>{formatTime(seconds)}</span>
          </div>
        </div>

        {/* Center block */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '0 40px' }}>
          <div style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check color={Colors.white} size={48} />
          </div>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 36, color: Colors.white, textAlign: 'center', lineHeight: 1.1, whiteSpace: 'pre-line' }}>
            {isAllDone ? '¡ENTRENAMIENTO\nCOMPLETO!' : '¡EJERCICIO\nCOMPLETADO!'}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', textAlign: 'center' }}>
              {currentEx?.name}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '8px 16px' }}>
                <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 16, color: Colors.white }}>{currentEx?.targetSets} series</span>
              </div>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '8px 16px' }}>
                <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 16, color: Colors.white }}>{lastReps} reps · {lastKg} {weightUnit}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 24px', paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {logs.map((_, i) => {
                const done = i <= currentExIdx;
                return (
                  <div key={i} style={{
                    width: 10, height: 10, borderRadius: 5,
                    backgroundColor: done ? Colors.white : 'rgba(0,0,0,0.3)',
                    border: done ? 'none' : `2px solid ${Colors.white}`,
                  }} />
                );
              })}
            </div>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
              {currentExIdx + 1} de {logs.length} ejercicios
            </span>
          </div>

          {isAllDone ? (
            <button onClick={() => doSave(logs)} disabled={saving} style={{
              width: '100%', height: 56, borderRadius: 16, backgroundColor: Colors.white,
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <Check color={Colors.orange} size={20} />
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.orange, letterSpacing: 0.5 }}>
                {saving ? 'GUARDANDO...' : 'GUARDAR ENTRENAMIENTO'}
              </span>
            </button>
          ) : isResting ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 14, padding: '14px 20px' }}>
                <Timer color={Colors.white} size={20} />
                <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 28, color: Colors.white }}>{restSecsLeft}s</span>
                <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>descansando</span>
              </div>
              <button onClick={() => { setIsResting(false); setRestSecsLeft(0); advanceRef.current?.(); }} style={{
                width: '100%', height: 56, borderRadius: 16, backgroundColor: Colors.white,
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                <ArrowRight color={Colors.orange} size={20} />
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.orange, letterSpacing: 0.5 }}>SALTAR DESCANSO</span>
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => { setIsResting(true); setRestSecsLeft(restSecs); }} style={{
                width: '100%', borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.2)',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 20px',
              }}>
                <Timer color={Colors.white} size={18} />
                <span style={{ fontFamily: Fonts.heading, fontWeight: 600, fontSize: 14, color: Colors.white, letterSpacing: 0.5 }}>DESCANSAR {restSecs}s</span>
              </button>
              <button onClick={() => advanceRef.current()} style={{
                width: '100%', height: 56, borderRadius: 16, backgroundColor: Colors.white,
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                <ArrowRight color={Colors.orange} size={20} />
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.orange, letterSpacing: 0.5 }}>
                  SIGUIENTE EJERCICIO
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ─── View: Ver rutina overlay ─────────────────────── */
  if (loggingView === 'ver-rutina') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: Colors.bgPage }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `12px 24px`, paddingTop: 'calc(12px + env(safe-area-inset-top))' }}>
          <button onClick={() => setLoggingView('active')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <X color={Colors.gray} size={22} />
          </button>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 600, fontSize: 18, color: Colors.white, letterSpacing: 1 }}>MI RUTINA</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: Colors.bgElevated, borderRadius: 16, padding: '6px 12px' }}>
            <Clock color={Colors.teal} size={14} />
            <span style={{ fontFamily: Fonts.mono, fontWeight: 600, fontSize: 12, color: Colors.teal }}>{formatTime(seconds)}</span>
          </div>
        </div>
        <span style={{ fontFamily: Fonts.heading, fontWeight: 600, fontSize: 14, color: Colors.gray, letterSpacing: 2, textAlign: 'center', paddingBottom: 4 }}>
          {selectedDay.toUpperCase()}
        </span>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {logs.map((ex, exI) => {
            const isCompleted = exI < currentExIdx;
            const isCurrent = exI === currentExIdx;
            const doneSets = ex.sets.filter((s) => s.done).length;
            return (
              <div key={ex.id} style={{
                backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
                display: 'flex', flexDirection: 'column', gap: 12,
                borderLeft: isCurrent ? `3px solid ${Colors.orange}` : '3px solid transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isCompleted || isCurrent ? Colors.orange : Colors.gray }} />
                    <span style={{ fontFamily: Fonts.heading, fontWeight: 600, fontSize: 14, color: isCompleted || isCurrent ? Colors.white : Colors.gray, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      {ex.name}
                    </span>
                  </div>
                  <span style={{ fontFamily: Fonts.mono, fontWeight: 600, fontSize: 12, color: isCompleted ? Colors.teal : isCurrent ? Colors.orange : Colors.gray }}>
                    {doneSets}/{ex.targetSets}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                    {ex.sets.map((s, sI) => {
                      const isCurrSet = isCurrent && s.setNum === currentSetNum;
                      const isPastSet = s.done;
                      if (isPastSet) {
                        return (
                          <button key={sI} onClick={() => setEditingSet({ exIdx: exI, setNum: s.setNum, reps: s.reps, weight: s.weight })}
                            style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.teal, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>S{s.setNum}: {s.reps}×{s.weight}{weightUnit}  ✓</span>
                            <Pencil color={Colors.teal} size={10} />
                          </button>
                        );
                      }
                      if (isCurrSet) return <span key={sI} style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.orange }}>S{s.setNum}: en curso...</span>;
                      return <span key={sI} style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>S{s.setNum}: {ex.targetReps}×—</span>;
                    })}
                  </div>
                  {!isCompleted && !isCurrent && (
                    <button
                      onClick={() => setJumpConfirmIdx(exI)}
                      style={{
                        width: 32, height: 32, flexShrink: 0,
                        border: `1px solid ${Colors.orange}50`,
                        borderRadius: Radius.sm,
                        backgroundColor: Colors.orange + '10',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <CornerDownRight color={Colors.orange} size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <button onClick={() => setLoggingView('active')} style={{
            height: 48, borderRadius: 16, backgroundColor: Colors.bgElevated,
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white, letterSpacing: 0.5 }}>VOLVER AL EJERCICIO</span>
          </button>
        </div>

        {/* Jump confirmation modal */}
        {jumpConfirmIdx !== null && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}
            onClick={() => setJumpConfirmIdx(null)}>
            <div onClick={(e) => e.stopPropagation()} style={{
              width: '100%', backgroundColor: Colors.bgCard, borderRadius: '20px 20px 0 0',
              padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.bgPlaceholder, alignSelf: 'center' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.orange + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CornerDownRight color={Colors.orange} size={20} />
                </div>
                <div>
                  <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white }}>
                    ¿SALTAR A ESTE EJERCICIO?
                  </div>
                  <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.orange, marginTop: 2 }}>
                    {logs[jumpConfirmIdx]?.name}
                  </div>
                </div>
              </div>
              <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, lineHeight: 1.6 }}>
                Al terminar este ejercicio volverás automáticamente al siguiente pendiente en orden.
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => {
                    const idx = jumpConfirmIdx!;
                    const firstUndoneSetNum = logs[idx].sets.find(s => !s.done)?.setNum ?? 1;
                    setCurrentExIdx(idx);
                    setCurrentSetNum(firstUndoneSetNum);
                    setExAnimKey(k => k + 1);
                    setJumpConfirmIdx(null);
                    setLoggingView('active');
                  }}
                  style={{ height: 52, borderRadius: Radius.lg, backgroundColor: Colors.orange, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.blackText, letterSpacing: 0.5 }}
                >
                  SÍ, SALTAR
                </button>
                <button
                  onClick={() => setJumpConfirmIdx(null)}
                  style={{ height: 52, borderRadius: Radius.lg, backgroundColor: Colors.bgElevated, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.gray, letterSpacing: 0.5 }}
                >
                  CANCELAR
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit set modal */}
        {editingSet && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}
            onClick={() => setEditingSet(null)}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', backgroundColor: Colors.bgCard, borderRadius: '20px 20px 0 0', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.bgPlaceholder, alignSelf: 'center' }} />
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white }}>EDITAR SERIE {editingSet.setNum}</span>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontFamily: Fonts.heading, fontWeight: 600, fontSize: 12, color: Colors.gray, letterSpacing: 1, textAlign: 'center' }}>REPS</span>
                  <input value={editingSet.reps}
                    onChange={(e) => setEditingSet((prev) => prev ? { ...prev, reps: e.target.value } : null)}
                    type="number" inputMode="numeric"
                    style={{ height: 64, borderRadius: 12, backgroundColor: Colors.bgElevated, border: `2px solid ${Colors.teal}`, textAlign: 'center', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 28, color: Colors.white, outline: 'none', width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontFamily: Fonts.heading, fontWeight: 600, fontSize: 12, color: Colors.orange, letterSpacing: 1, textAlign: 'center' }}>{weightUnit.toUpperCase()}</span>
                  <input value={editingSet.weight}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d{0,1}$/.test(val)) setEditingSet((prev) => prev ? { ...prev, weight: val } : null);
                    }}
                    type="text" inputMode="decimal"
                    style={{ height: 64, borderRadius: 12, backgroundColor: Colors.bgElevated, border: `2px solid ${Colors.orange}`, textAlign: 'center', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 28, color: Colors.white, outline: 'none', width: '100%' }}
                  />
                </div>
              </div>
              <button onClick={() => {
                setLogs((prev) => prev.map((ex, i) =>
                  i === editingSet.exIdx
                    ? { ...ex, sets: ex.sets.map((s) => s.setNum === editingSet.setNum ? { ...s, reps: editingSet.reps, weight: editingSet.weight } : s) }
                    : ex
                ));
                setEditingSet(null);
              }} style={{ height: 52, borderRadius: 14, backgroundColor: Colors.teal, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.blackText, letterSpacing: 0.5 }}>
                GUARDAR CAMBIO
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── View: Active logging ─────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: Colors.bgPage }}>
      <style>{`
        @keyframes toastIn {
          0%   { opacity: 0; transform: translateX(-50%) scale(0.85); }
          20%  { opacity: 1; transform: translateX(-50%) scale(1); }
          75%  { opacity: 1; transform: translateX(-50%) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) scale(0.85); }
        }
        @keyframes slideFromRight {
          from { opacity: 0; transform: translateX(36px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .exercise-slide { animation: slideFromRight 0.3s cubic-bezier(0.25,0.46,0.45,0.94); }
      `}</style>

      {/* Set completion toast */}
      {flashSetNum !== null && (
        <div key={flashSetNum} style={{
          position: 'absolute', top: 'calc(72px + env(safe-area-inset-top))', left: '50%',
          transform: 'translateX(-50%)', zIndex: 100,
          backgroundColor: Colors.teal, borderRadius: 20, padding: '8px 22px',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'toastIn 1.1s ease forwards', whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          <Check color={Colors.blackText} size={14} />
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.blackText, letterSpacing: 0.5 }}>
            SERIE {flashSetNum} COMPLETADA
          </span>
        </div>
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `12px 24px`, paddingTop: 'calc(12px + env(safe-area-inset-top))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setShowExitModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <ArrowLeft color={Colors.white} size={22} />
          </button>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 600, fontSize: 18, color: Colors.white, textTransform: 'uppercase' }}>{selectedDay}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: Colors.bgElevated, borderRadius: 16, padding: '6px 12px' }}>
          <Clock color={Colors.teal} size={14} />
          <span style={{ fontFamily: Fonts.mono, fontWeight: 600, fontSize: 12, color: Colors.teal }}>{formatTime(seconds)}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 32, overflowY: 'auto' }}>
        {/* Progress row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 600, fontSize: 13, color: Colors.gray, letterSpacing: 1 }}>
            EJERCICIO {currentExIdx + 1} DE {logs.length}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {logs.map((_, i) => (
              <div key={i} style={{ width: 24, height: 4, borderRadius: 2, backgroundColor: i < currentExIdx ? Colors.teal : i === currentExIdx ? Colors.orange : Colors.bgElevated }} />
            ))}
          </div>
        </div>

        {/* Exercise name + muscle */}
        <div key={exAnimKey} className="exercise-slide" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {groupSize > 1 && (
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 11, color: Colors.orange, letterSpacing: 2, backgroundColor: Colors.orange + '20', borderRadius: 20, padding: '4px 14px' }}>
              {groupSize >= 3 ? 'TRI-SERIE' : 'BI-SERIE'}
            </span>
          )}
          {groupMembers.map((member, gi) => (
            <React.Fragment key={member.id}>
              {gi > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <div style={{ width: 2, height: 12, backgroundColor: Colors.orange + '70', borderRadius: 1 }} />
                  <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.orange }}>seguido de</span>
                  <div style={{ width: 2, height: 12, backgroundColor: Colors.orange + '70', borderRadius: 1 }} />
                </div>
              )}
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: gi === 0 ? (groupSize > 1 ? 24 : 32) : 22, color: Colors.white, textAlign: 'center', lineHeight: 1.1, textTransform: 'uppercase' }}>
                {member.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {member.muscle && (
                  <span style={{ fontFamily: Fonts.mono, fontSize: gi === 0 ? 12 : 11, color: Colors.gray }}>{member.muscle}</span>
                )}
                {member.gifUrl && (
                  <button onClick={() => setGifSource(gi === 0 ? 'current' : gi === 1 ? 'partner' : 'partner2')}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: Colors.bgElevated, border: 'none', borderRadius: 12, padding: '4px 10px', cursor: 'pointer' }}>
                    <Film color={Colors.orange} size={12} />
                    <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.orange, letterSpacing: 0.3 }}>VER GIF</span>
                  </button>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Set indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: Colors.bgElevated, borderRadius: 20, padding: '8px 20px' }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.orange }} />
            <span style={{ fontFamily: Fonts.heading, fontWeight: 600, fontSize: 14, color: Colors.white, letterSpacing: 0.5 }}>
              SERIE {currentSetNum} DE {currentEx?.targetSets}
            </span>
          </div>
          {prevSetData && (prevSetData.reps || prevSetData.weight) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <History color={Colors.gray} size={14} />
              <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>
                Última vez: {prevSetData.reps} reps × {prevSetData.weight} {weightUnit}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            {Array.from({ length: currentEx?.targetSets ?? 0 }, (_, i) => {
              const setNum = i + 1;
              const isDone = logs[currentExIdx]?.sets[i]?.done ?? false;
              const isCurrent = setNum === currentSetNum;
              return (
                <div key={setNum} style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: isDone ? Colors.teal : isCurrent ? Colors.orange : 'transparent',
                  border: isDone || isCurrent ? 'none' : `2px solid ${Colors.bgPlaceholder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isDone ? <Check color={Colors.blackText} size={14} /> : (
                    <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: isCurrent ? Colors.blackText : Colors.gray }}>{setNum}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Nota del coach */}
        {currentEx?.coachNote && (
          <div style={{ backgroundColor: Colors.orange + '15', borderRadius: Radius.md, padding: '10px 14px', borderLeft: `3px solid ${Colors.orange}` }}>
            <div style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.orange, letterSpacing: 0.5, marginBottom: 4 }}>NOTA DEL COACH</div>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.white, lineHeight: 1.5 }}>{currentEx.coachNote}</span>
          </div>
        )}

        {/* Inputs */}
        {groupSize > 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {groupMembers.map((member, gi) => {
              const repsV = [repsValue, repsValue2, repsValue3][gi];
              const setRepsV = [setRepsValue, setRepsValue2, setRepsValue3][gi];
              const kgV = [kgValue, kgValue2, kgValue3][gi];
              const setKgV = [setKgValue, setKgValue2, setKgValue3][gi];
              const borderColor = gi === 0 ? Colors.orange : Colors.orange + '60';
              return (
                <React.Fragment key={member.id}>
                  {gi > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 1, backgroundColor: Colors.orange + '30' }} />
                      <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.orange }}>seguido de</span>
                      <div style={{ flex: 1, height: 1, backgroundColor: Colors.orange + '30' }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.orange, letterSpacing: 0.5, textAlign: 'center', textTransform: 'uppercase' }}>{member.name}</span>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontFamily: Fonts.heading, fontWeight: 600, fontSize: 11, color: Colors.gray, letterSpacing: 1, textAlign: 'center' }}>REPS</span>
                        <input value={repsV} onChange={(e) => setRepsV(e.target.value)}
                          placeholder={String(member.targetReps ?? '')} type="number" inputMode="numeric"
                          style={{ height: 64, borderRadius: 12, backgroundColor: Colors.bgCard, border: `2px solid ${borderColor}`, textAlign: 'center', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 28, color: Colors.white, outline: 'none', width: '100%' }} />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {gi === 0 ? (
                          <button onClick={toggleWeightUnit} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <span style={{ fontFamily: Fonts.heading, fontWeight: 600, fontSize: 11, color: Colors.orange, letterSpacing: 1 }}>{weightUnit.toUpperCase()}</span>
                            <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray }}>↕</span>
                          </button>
                        ) : (
                          <span style={{ fontFamily: Fonts.heading, fontWeight: 600, fontSize: 11, color: Colors.orange, letterSpacing: 1, textAlign: 'center' }}>{weightUnit.toUpperCase()}</span>
                        )}
                        <input value={kgV} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d*\.?\d{0,1}$/.test(v)) setKgV(v); }}
                          placeholder="0" type="text" inputMode="decimal"
                          style={{ height: 64, borderRadius: 12, backgroundColor: Colors.bgCard, border: `2px solid ${borderColor}`, textAlign: 'center', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 28, color: Colors.white, outline: 'none', width: '100%' }} />
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontFamily: Fonts.heading, fontWeight: 600, fontSize: 12, color: Colors.gray, letterSpacing: 1, textAlign: 'center' }}>REPS</span>
              <input value={repsValue} onChange={(e) => setRepsValue(e.target.value)}
                placeholder={String(currentEx?.targetReps ?? '')} type="number" inputMode="numeric"
                style={{ height: 80, borderRadius: 16, backgroundColor: Colors.bgCard, border: `2px solid ${Colors.orange}`, textAlign: 'center', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 36, color: Colors.white, outline: 'none', width: '100%' }}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={toggleWeightUnit} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span style={{ fontFamily: Fonts.heading, fontWeight: 600, fontSize: 12, color: Colors.orange, letterSpacing: 1 }}>{weightUnit.toUpperCase()}</span>
                <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray }}>↕</span>
              </button>
              <input value={kgValue} onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d{0,1}$/.test(val)) setKgValue(val);
                }}
                placeholder="0" type="text" inputMode="decimal"
                style={{ height: 80, borderRadius: 16, backgroundColor: Colors.bgCard, border: `2px solid ${Colors.orange}`, textAlign: 'center', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 36, color: Colors.white, outline: 'none', width: '100%' }}
              />
            </div>
          </div>
        )}

        {/* Per-exercise notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {currentEx && prevExNotesMap.get(currentEx.id) && (
            <div style={{ display: 'flex', gap: 8, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, padding: '8px 12px', alignItems: 'flex-start' }}>
              <FileText color={Colors.teal} size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, lineHeight: 1.5 }}>
                <span style={{ color: Colors.teal }}>Sesión anterior: </span>{prevExNotesMap.get(currentEx.id)}
              </span>
            </div>
          )}
          <textarea
            value={currentExNotes}
            onChange={(e) => {
              setCurrentExNotes(e.target.value);
              if (currentEx) exNotesRef.current.set(currentEx.id, e.target.value);
            }}
            placeholder={`Notas para ${currentEx?.name ?? 'este ejercicio'}...`}
            rows={2}
            style={{
              width: '100%', borderRadius: Radius.md, backgroundColor: Colors.bgCard,
              border: `1px solid ${Colors.bgElevated}`, padding: '10px 12px',
              fontFamily: Fonts.mono, fontSize: 12, color: Colors.white,
              resize: 'none', outline: 'none', lineHeight: 1.5,
            }}
          />
        </div>

        {/* Complete button */}
        <button onClick={handleCompleteSet} disabled={saving} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          height: 56, borderRadius: 16, backgroundColor: Colors.orange,
          border: 'none', cursor: saving ? 'not-allowed' : 'pointer', width: '100%',
        }}>
          <Check color={Colors.blackText} size={22} />
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.blackText, letterSpacing: 0.5 }}>
            {saving ? 'GUARDANDO...' : groupSize >= 3 ? 'COMPLETAR TRI-SERIE' : groupSize === 2 ? 'COMPLETAR BI-SERIE' : 'COMPLETAR SERIE'}
          </span>
        </button>
      </div>

      {/* Bottom bar */}
      <div style={{ backgroundColor: Colors.bgCard, padding: '12px 24px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {nextEx ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 600, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>SIGUIENTE</span>
            <span style={{ fontFamily: Fonts.mono, fontWeight: 600, fontSize: 13, color: Colors.white }}>{nextEx.name}</span>
          </div>
        ) : (
          <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.teal }}>ÚLTIMO EJERCICIO</span>
        )}
        <button onClick={() => setLoggingView('ver-rutina')} style={{
          display: 'flex', alignItems: 'center', gap: 6, backgroundColor: Colors.bgElevated,
          borderRadius: Radius.md, padding: '8px 12px', border: 'none', cursor: 'pointer', flexShrink: 0,
        }}>
          <List color={Colors.gray} size={14} />
          <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11, color: Colors.gray }}>VER RUTINA</span>
        </button>
      </div>

      {/* GIF overlay */}
      {(() => {
        const gifEx = gifSource === 'current' ? groupMembers[0] : gifSource === 'partner' ? groupMembers[1] : gifSource === 'partner2' ? groupMembers[2] : null;
        if (!gifEx?.gifUrl) return null;
        return (
        <div
          onClick={() => setGifSource(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 342 }}>
            <div style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.bgCard }}>
              <div style={{ backgroundColor: Colors.bgElevated, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
                {gifEx.gifUrl.endsWith('.mp4') ? (
                  <video src={gifEx.gifUrl} autoPlay loop muted playsInline style={{ width: '100%', display: 'block' }} />
                ) : (
                  <img src={gifEx.gifUrl} alt={gifEx.name} style={{ width: '100%', display: 'block' }} />
                )}
              </div>
              <div style={{ padding: '14px 16px 16px' }}>
                <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white, letterSpacing: 0.5, textTransform: 'uppercase' }}>{gifEx.name}</div>
                {gifEx.muscle && <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>{gifEx.muscle}</div>}
                <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, marginTop: 8, opacity: 0.6 }}>toca fuera para cerrar</div>
              </div>
            </div>
            <button
              onClick={() => setGifSource(null)}
              style={{ position: 'absolute', top: -12, right: -12, width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bgElevated, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X color={Colors.white} size={14} />
            </button>
          </div>
        </div>
        );
      })()}

      {/* Exit modal */}
      {showExitModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}
          onClick={() => setShowExitModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', backgroundColor: Colors.bgCard, borderRadius: '20px 20px 0 0',
            padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.bgPlaceholder, alignSelf: 'center', marginBottom: 8 }} />
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.white }}>¿SALIR DEL ENTRENAMIENTO?</span>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, lineHeight: 1.6 }}>
              Llevas {formatTime(seconds)} y {logs.reduce((a, ex) => a + ex.sets.filter((s) => s.done).length, 0)} series completadas.
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <button onClick={handleSaveAndExit} disabled={saving} style={{ height: 52, borderRadius: Radius.lg, backgroundColor: Colors.orange, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.blackText, letterSpacing: 0.5 }}>
                {saving ? 'GUARDANDO...' : 'GUARDAR Y SALIR'}
              </button>
              <button
                onClick={() => { setShowExitModal(false); navigate('/trainee/history'); }}
                style={{ height: 52, borderRadius: Radius.lg, backgroundColor: Colors.bgElevated, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white, letterSpacing: 0.5 }}
              >
                NAVEGAR Y CONTINUAR
              </button>
              <button onClick={() => { clearDraft(); setShowExitModal(false); navigate(-1); }} style={{ height: 52, borderRadius: Radius.lg, backgroundColor: 'transparent', border: `1px solid ${Colors.bgElevated}`, cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.gray, letterSpacing: 0.5 }}>
                SALIR SIN GUARDAR
              </button>
              <button onClick={() => setShowExitModal(false)} style={{ height: 52, borderRadius: Radius.lg, backgroundColor: 'transparent', border: `1px solid ${Colors.bgElevated}`, cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white, letterSpacing: 0.5 }}>
                CONTINUAR ENTRENANDO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
