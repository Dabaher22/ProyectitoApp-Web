import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Minus, Plus, X, Timer, ChevronUp, ChevronDown, Film } from 'lucide-react';
import BtnPrimary from '../../components/BtnPrimary';
import ScreenHeader from '../../components/ScreenHeader';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { createRoutine, updateRoutineFull } from '../../services/routines';
import { updateMicrocycleEntry } from '../../services/periodization';
import { useAuthStore } from '../../store/authStore';
import { dirtyGuard } from '../../store/dirtyGuard';
import { saveRoutineDraft, getRoutineDraft, clearRoutineDraft } from '../../store/routineDraft';
import { GIF_MUSCLES } from '../../data/gifLibrary';
import { GifMeta, getGifLibrary } from '../../services/gifLibrary';
import type { DayConfig, ExerciseEntry } from './ExerciseSelectionScreen';

interface ExConfig extends ExerciseEntry {
  sets: number;
  reps: number;
  rest: number;       // 0 = sin descanso definido
  equipment: string;
  gifUrl?: string;
  coachNote?: string;
  supersetGroupId?: string;
}

interface DayConfigFull {
  number: string;
  name: string;
  exercises: ExConfig[];
}

/* ─── Counter ──────────────────────────────────────── */
function Counter({ value, onInc, onDec, label }: { value: number; onInc: () => void; onDec: () => void; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray, letterSpacing: 0.5 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
        <button onClick={onDec} style={{ width: 28, height: 28, backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Minus color={Colors.white} size={14} />
        </button>
        <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.white, minWidth: 28, textAlign: 'center' }}>{value}</span>
        <button onClick={onInc} style={{ width: 28, height: 28, backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Plus color={Colors.white} size={14} />
        </button>
      </div>
    </div>
  );
}

/* ─── Rest control (optional) ─────────────────────── */
function RestControl({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  if (value === 0) {
    return (
      <button onClick={() => onChange(60)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        backgroundColor: Colors.bgElevated, borderRadius: Radius.md,
        border: `1px dashed ${Colors.bgPlaceholder}`,
        padding: '6px 12px', cursor: 'pointer',
      }}>
        <Timer color={Colors.gray} size={14} />
        <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>+ Agregar descanso</span>
      </button>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, padding: `${Spacing.xs}px ${Spacing.sm}px` }}>
      <Timer color={Colors.teal} size={14} />
      <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>Descanso</span>
      <button onClick={() => onChange(Math.max(15, value - 15))} style={{ width: 24, height: 24, backgroundColor: Colors.bgPage, borderRadius: Radius.sm, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Minus color={Colors.white} size={12} />
      </button>
      <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 14, color: Colors.teal, minWidth: 36, textAlign: 'center' }}>{value}s</span>
      <button onClick={() => onChange(value + 15)} style={{ width: 24, height: 24, backgroundColor: Colors.bgPage, borderRadius: Radius.sm, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Plus color={Colors.white} size={12} />
      </button>
      <button onClick={() => onChange(0)} style={{ width: 24, height: 24, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}>
        <X color={Colors.gray} size={14} />
      </button>
    </div>
  );
}

/* ─── Main screen ──────────────────────────────────── */
export default function SetsRepsConfigScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const uid = useAuthStore((s) => s.uid)!;
  const state = location.state as {
    dayConfigs?: DayConfig[];
    routineId?: string;
    routineName?: string;
    type?: string;
    macrocycleId?: string;
    mesocycleId?: string;
    weekNumber?: number;
  } | null;

  // Always read draft — fallback when state exists but lacks dayConfigs (e.g. back navigation)
  const draft = getRoutineDraft(uid);
  const fromDraftResume = !!(state as any)?.fromDraftResume;
  const effectiveState = state ?? (draft ? {
    dayConfigs: draft.dayConfigs as DayConfig[],
    routineId: draft.routineId,
    routineName: draft.routineName,
    type: draft.routineType,
  } : null);

  const [configs, setConfigs] = useState<DayConfigFull[]>(
    (effectiveState?.dayConfigs ?? []).map((d) => ({
      ...d,
      exercises: d.exercises.map((e) => ({
        ...e,
        equipment: (e as any).equipment ?? '',
        sets: (e as any).sets ?? 3,
        reps: (e as any).reps ?? 10,
        rest: (e as any).rest ?? 0,
      })),
    }))
  );

  useEffect(() => {
    if (configs.length === 0 || !effectiveState?.routineId) return;
    saveRoutineDraft(uid, {
      step: 3,
      routineId: effectiveState.routineId!,
      routineName: effectiveState.routineName ?? '',
      routineType: effectiveState.type ?? '',
      days: configs.map((d) => d.name || `Día ${d.number}`),
      dayConfigs: configs,
    });
  }, [configs]);
  const [saving, setSaving] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const pendingNavRef = useRef<(() => void) | null>(null);
  const [gifModal, setGifModal] = useState<{ dayIdx: number; exId: string; name: string; currentUrl: string } | null>(null);
  const [gifActiveTab, setGifActiveTab] = useState(GIF_MUSCLES[0]);
  const [gifItems, setGifItems] = useState<GifMeta[]>([]);
  const [gifLoading, setGifLoading] = useState(false);

  // Sync module-level dirty flag so CoachLayout bottom nav puede chequearlo
  useEffect(() => {
    dirtyGuard.set(isDirty);
  }, [isDirty]);

  // Registrar callback de guardado para que CoachLayout pueda guardar desde el nav
  const handleSaveRef = useRef<(afterSave?: () => void) => Promise<void>>(async () => {});
  useEffect(() => {
    dirtyGuard.setSaveCallback(() => handleSaveRef.current(() => {}));
    return () => { dirtyGuard.set(false); dirtyGuard.setSaveCallback(null); };
  }, []);

  // Interceptar botón físico de atrás cuando hay cambios sin guardar
  useEffect(() => {
    if (!isDirty) return;
    window.history.pushState(null, '', window.location.href);
    const handler = () => {
      if (dirtyGuard.get()) {
        window.history.pushState(null, '', window.location.href);
        pendingNavRef.current = fromDraftResume ? goToExerciseSelection : () => navigate(-2);
        setShowExitModal(true);
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [isDirty, navigate, fromDraftResume]);

  const markDirty = () => {
    setIsDirty(true);
    dirtyGuard.set(true);
  };

  const updateSetsReps = (dayIdx: number, exId: string, field: 'sets' | 'reps', delta: number) => {
    markDirty();
    setConfigs((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? { ...d, exercises: d.exercises.map((e) => e.id === exId ? { ...e, [field]: Math.max(1, e[field] + delta) } : e) }
          : d
      )
    );
  };

  const updateRest = (dayIdx: number, exId: string, value: number) => {
    markDirty();
    setConfigs((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? { ...d, exercises: d.exercises.map((e) => e.id === exId ? { ...e, rest: value } : e) }
          : d
      )
    );
  };

  const updateGifUrl = (dayIdx: number, exId: string, url: string) => {
    markDirty();
    setConfigs((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? { ...d, exercises: d.exercises.map((e) => e.id === exId ? { ...e, gifUrl: url || undefined } : e) }
          : d
      )
    );
  };

  const updateCoachNote = (dayIdx: number, exId: string, note: string) => {
    markDirty();
    setConfigs((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? { ...d, exercises: d.exercises.map((e) => e.id === exId ? { ...e, coachNote: note || undefined } : e) }
          : d
      )
    );
  };

  const moveExercise = (dayIdx: number, exIdx: number, dir: 'up' | 'down') => {
    markDirty();
    setConfigs((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const exs = [...d.exercises];
        const target = dir === 'up' ? exIdx - 1 : exIdx + 1;
        if (target < 0 || target >= exs.length) return d;
        [exs[exIdx], exs[target]] = [exs[target], exs[exIdx]];
        return { ...d, exercises: exs };
      })
    );
  };

  const handleSave = async (afterSave?: () => void) => {
    setSaving(true);
    try {
      const routineId = effectiveState?.routineId;
      const allExercises = configs.flatMap((d) =>
        d.exercises.map((e) => ({
          id: e.id,
          name: e.name,
          muscle: e.muscle,
          equipment: e.equipment || '',
          sets: e.sets,
          reps: e.reps,
          rest: e.rest,
          day: d.name || `Día ${d.number}`,
          ...((e as any).type === 'cardio' ? { type: 'cardio', durationMinutes: (e as any).durationMinutes ?? 0 } : {}),
          ...(e.gifUrl ? { gifUrl: e.gifUrl } : {}),
          ...(e.coachNote ? { coachNote: e.coachNote } : {}),
          ...(e.supersetGroupId ? { supersetGroupId: e.supersetGroupId } : {}),
        }))
      );
      const dayNames = configs.map((d) => d.name || `Día ${d.number}`);
      const routineData = {
        name: effectiveState?.routineName ?? '',
        type: effectiveState?.type ?? '',
        days: dayNames,
        exercises: allExercises as any,
      };

      const macroCtx = effectiveState as any;
      if (routineId && routineId !== 'new') {
        await updateRoutineFull(routineId, routineData);
        setIsDirty(false);
        dirtyGuard.set(false);
        clearRoutineDraft(uid);
        if (macroCtx?.macrocycleId && macroCtx?.mesocycleId) {
          navigate(`/coach/periodization/${macroCtx.macrocycleId}/${macroCtx.mesocycleId}/create-micro`, { replace: true });
        } else if (afterSave) {
          afterSave();
        } else {
          alert('¡Rutina guardada correctamente!');
          navigate('/coach/routines');
        }
        return;
      } else {
        const newId = await createRoutine(uid, {
          ...routineData,
          ...(macroCtx?.macrocycleId ? { macrocycleId: macroCtx.macrocycleId } : {}),
        });
        if (macroCtx?.macrocycleId && macroCtx?.mesocycleId && macroCtx?.weekNumber !== undefined) {
          await updateMicrocycleEntry(macroCtx.mesocycleId, macroCtx.weekNumber, {
            routineId: newId,
            routineName: effectiveState?.routineName ?? '',
          });
          setIsDirty(false);
          dirtyGuard.set(false);
          clearRoutineDraft(uid);
          navigate(`/coach/periodization/${macroCtx.macrocycleId}/${macroCtx.mesocycleId}/create-micro`, { replace: true });
          return;
        }
      }
      setIsDirty(false);
      dirtyGuard.set(false);
      clearRoutineDraft(uid);
      if (afterSave) {
        afterSave();
      } else {
        alert('¡Rutina guardada correctamente!');
        navigate('/coach/routines');
      }
    } catch {
      alert('No se pudo guardar la rutina. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // Keep ref always pointing to latest handleSave (avoids stale closure in dirtyGuard callback)
  handleSaveRef.current = handleSave;

  const openGifModal = (dayIdx: number, exId: string, name: string, currentUrl: string, muscle: string) => {
    const tab = GIF_MUSCLES.find(m => m === muscle) ?? GIF_MUSCLES[0];
    setGifActiveTab(tab);
    setGifModal({ dayIdx, exId, name, currentUrl });
    if (gifItems.length === 0) {
      setGifLoading(true);
      getGifLibrary().then(items => { setGifItems(items); setGifLoading(false); });
    }
  };

  const goToExerciseSelection = () => navigate('/coach/exercise-selection', {
    state: {
      routineId: effectiveState?.routineId ?? 'new',
      routineName: effectiveState?.routineName ?? '',
      days: configs.map((d) => d.number),
      type: effectiveState?.type ?? '',
      initialDayConfigs: configs,
    },
    replace: true,
  });

  const handleBackPress = () => {
    const performBack = fromDraftResume ? goToExerciseSelection : () => navigate(-1);
    if (isDirty) {
      pendingNavRef.current = performBack;
      setShowExitModal(true);
    } else {
      performBack();
    }
  };

  const handleModalSaveAndLeave = async () => {
    const navFn = pendingNavRef.current;
    await handleSave(() => {
      setShowExitModal(false);
      alert('¡Rutina guardada correctamente!');
      navFn?.();
    });
  };

  const handleModalLeaveWithoutSave = () => {
    const navFn = pendingNavRef.current;
    setIsDirty(false);
    dirtyGuard.set(false);
    setShowExitModal(false);
    navFn?.();
  };

  const current = configs[activeDay];

  return (
    <div className="screen-full" style={{ display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader title="SERIES Y REPS" onBack={handleBackPress} />

      {/* Day tabs */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: `${Spacing.sm}px ${Spacing.lg}px 0`, borderBottom: `1px solid ${Colors.bgElevated}` }}>
        {configs.map((d, i) => (
          <button key={d.number} onClick={() => setActiveDay(i)} style={{
            paddingLeft: 16, paddingRight: 16, paddingTop: 8, paddingBottom: 10,
            background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, letterSpacing: 0.5,
            color: activeDay === i ? Colors.orange : Colors.gray,
            borderBottom: `2px solid ${activeDay === i ? Colors.orange : 'transparent'}`,
          }}>
            {d.name ? d.name.toUpperCase() : `DÍA ${d.number}`}
          </button>
        ))}
      </div>

      {/* Exercises */}
      <div style={{ flex: 1, overflowY: 'auto', padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
        {(() => {
          const exs = current?.exercises ?? [];
          const cards: React.ReactNode[] = [];
          let i = 0;
          while (i < exs.length) {
            const item = exs[i];

            // Cardio entry — render differently
            if ((item as any).type === 'cardio') {
              const idx = i;
              const durationMin = (item as any).durationMinutes ?? 0;
              cards.push(
                <div key={item.id} style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, display: 'flex', alignItems: 'center', gap: Spacing.md, border: `1px solid ${Colors.teal}40` }}>
                  <Timer color={Colors.teal} size={22} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, textTransform: 'uppercase' }}>{item.name}</div>
                    <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.teal, marginTop: 2 }}>CARDIO</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray, letterSpacing: 0.5 }}>DURACIÓN</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => { markDirty(); setConfigs((prev) => prev.map((d, di) => di !== activeDay ? d : { ...d, exercises: d.exercises.map((e, ei) => ei !== idx ? e : { ...e, durationMinutes: Math.max(1, ((e as any).durationMinutes ?? 1) - 1) }) })); }}
                        style={{ width: 28, height: 28, backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Minus color={Colors.white} size={14} />
                      </button>
                      <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.teal, minWidth: 44, textAlign: 'center' }}>{durationMin}m</span>
                      <button onClick={() => { markDirty(); setConfigs((prev) => prev.map((d, di) => di !== activeDay ? d : { ...d, exercises: d.exercises.map((e, ei) => ei !== idx ? e : { ...e, durationMinutes: ((e as any).durationMinutes ?? 1) + 1 }) })); }}
                        style={{ width: 28, height: 28, backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus color={Colors.white} size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
              i++;
              continue;
            }

            if (item.supersetGroupId) {
              const idx = i;
              let runLen = 1;
              while (exs[idx + runLen]?.supersetGroupId === item.supersetGroupId) runLen++;
              const groupExs = exs.slice(idx, idx + runLen);
              const groupLabel = groupExs.length >= 3 ? 'TRI-SERIE' : 'BI-SERIE';

              cards.push(
                <div key={item.id} style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.md, border: `1px solid ${Colors.orange}40` }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 11, color: Colors.orange, letterSpacing: 1 }}>{groupLabel}</span>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button onClick={() => moveExercise(activeDay, idx, 'up')} disabled={idx === 0}
                        style={{ width: 28, height: 28, backgroundColor: idx === 0 ? Colors.bgPage : Colors.bgElevated, borderRadius: Radius.sm, border: 'none', cursor: idx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronUp color={idx === 0 ? Colors.bgPlaceholder : Colors.white} size={16} />
                      </button>
                      <button onClick={() => moveExercise(activeDay, idx, 'down')} disabled={idx + runLen >= exs.length}
                        style={{ width: 28, height: 28, backgroundColor: idx + runLen >= exs.length ? Colors.bgPage : Colors.bgElevated, borderRadius: Radius.sm, border: 'none', cursor: idx + runLen >= exs.length ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronDown color={idx + runLen >= exs.length ? Colors.bgPlaceholder : Colors.white} size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Ejercicios del grupo */}
                  {groupExs.map((ex, gi) => (
                    <React.Fragment key={ex.id}>
                      {gi > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 4 }}>
                          <div style={{ width: 2, height: 16, backgroundColor: Colors.orange + '60', borderRadius: 1 }} />
                          <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.orange, letterSpacing: 0.5 }}>SEGUIDO DE</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white, textTransform: 'uppercase' }}>{ex.name}</div>
                          {ex.muscle && <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 1 }}>{ex.muscle}</div>}
                        </div>
                        <button onClick={() => { openGifModal(activeDay, ex.id, ex.name, ex.gifUrl ?? '', ex.muscle); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: ex.gifUrl ? Colors.orange + '20' : Colors.bgElevated, border: `1px solid ${ex.gifUrl ? Colors.orange + '60' : 'transparent'}`, borderRadius: Radius.md, padding: '4px 10px', cursor: 'pointer' }}>
                          <Film color={ex.gifUrl ? Colors.orange : Colors.gray} size={13} />
                          <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: ex.gifUrl ? Colors.orange : Colors.gray }}>{ex.gifUrl ? 'GIF ✓' : '+GIF'}</span>
                        </button>
                      </div>
                    </React.Fragment>
                  ))}

                  {/* Series compartidas + reps independientes por ejercicio */}
                  <div style={{ backgroundColor: Colors.bgElevated, borderRadius: Radius.md, padding: Spacing.md, display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: Spacing.sm }}>
                    <Counter label="SERIES" value={item.sets}
                      onInc={() => groupExs.forEach((ex) => updateSetsReps(activeDay, ex.id, 'sets', 1))}
                      onDec={() => groupExs.forEach((ex) => updateSetsReps(activeDay, ex.id, 'sets', -1))} />
                    {groupExs.map((ex) => (
                      <React.Fragment key={ex.id}>
                        <div style={{ width: 1, height: 40, backgroundColor: Colors.bgCard }} />
                        <Counter label={`REPS ${ex.name.split(' ')[0]}`} value={ex.reps}
                          onInc={() => updateSetsReps(activeDay, ex.id, 'reps', 1)}
                          onDec={() => updateSetsReps(activeDay, ex.id, 'reps', -1)} />
                      </React.Fragment>
                    ))}
                  </div>

                  <RestControl value={item.rest} onChange={(v) => groupExs.forEach((ex) => updateRest(activeDay, ex.id, v))} />

                  <textarea value={item.coachNote ?? ''} onChange={(e) => updateCoachNote(activeDay, item.id, e.target.value)}
                    placeholder="Nota para el atleta (opcional)..." rows={2}
                    style={{ width: '100%', borderRadius: Radius.md, backgroundColor: Colors.bgElevated, border: `1px solid ${item.coachNote ? Colors.orange + '50' : Colors.bgPlaceholder}`, padding: '8px 12px', fontFamily: Fonts.mono, fontSize: 12, color: Colors.white, resize: 'none', outline: 'none', lineHeight: 1.5 }} />
                </div>
              );
              i += runLen;
            } else {
              const idx = i;
              cards.push(
                <div key={item.id} style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, textTransform: 'uppercase' }}>{item.name}</div>
                      {item.muscle && <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>{item.muscle}</div>}
                    </div>
                    <button onClick={() => { openGifModal(activeDay, item.id, item.name, item.gifUrl ?? '', item.muscle); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: item.gifUrl ? Colors.orange + '20' : Colors.bgElevated, border: `1px solid ${item.gifUrl ? Colors.orange + '60' : 'transparent'}`, borderRadius: Radius.md, padding: '4px 10px', cursor: 'pointer', flexShrink: 0 }}>
                      <Film color={item.gifUrl ? Colors.orange : Colors.gray} size={13} />
                      <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: item.gifUrl ? Colors.orange : Colors.gray, letterSpacing: 0.3 }}>{item.gifUrl ? 'GIF ✓' : '+GIF'}</span>
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button onClick={() => moveExercise(activeDay, idx, 'up')} disabled={idx === 0}
                        style={{ width: 28, height: 28, backgroundColor: idx === 0 ? Colors.bgPage : Colors.bgElevated, borderRadius: Radius.sm, border: 'none', cursor: idx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronUp color={idx === 0 ? Colors.bgPlaceholder : Colors.white} size={16} />
                      </button>
                      <button onClick={() => moveExercise(activeDay, idx, 'down')} disabled={idx === (exs.length - 1)}
                        style={{ width: 28, height: 28, backgroundColor: idx === exs.length - 1 ? Colors.bgPage : Colors.bgElevated, borderRadius: Radius.sm, border: 'none', cursor: idx === exs.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronDown color={idx === exs.length - 1 ? Colors.bgPlaceholder : Colors.white} size={16} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
                    <Counter label="SERIES" value={item.sets} onInc={() => updateSetsReps(activeDay, item.id, 'sets', 1)} onDec={() => updateSetsReps(activeDay, item.id, 'sets', -1)} />
                    <div style={{ width: 1, height: 40, backgroundColor: Colors.bgElevated }} />
                    <Counter label="REPS" value={item.reps} onInc={() => updateSetsReps(activeDay, item.id, 'reps', 1)} onDec={() => updateSetsReps(activeDay, item.id, 'reps', -1)} />
                  </div>
                  <RestControl value={item.rest} onChange={(v) => updateRest(activeDay, item.id, v)} />
                  <textarea value={item.coachNote ?? ''} onChange={(e) => updateCoachNote(activeDay, item.id, e.target.value)}
                    placeholder="Nota para el atleta (opcional)..." rows={2}
                    style={{ width: '100%', borderRadius: Radius.md, backgroundColor: Colors.bgElevated, border: `1px solid ${item.coachNote ? Colors.orange + '50' : Colors.bgPlaceholder}`, padding: '8px 12px', fontFamily: Fonts.mono, fontSize: 12, color: Colors.white, resize: 'none', outline: 'none', lineHeight: 1.5 }} />
                </div>
              );
              i++;
            }
          }
          return cards;
        })()}
      </div>

      {/* Barra de guardar */}
      <div style={{ padding: Spacing.lg, backgroundColor: Colors.bgCard, borderTop: `1px solid ${Colors.bgElevated}` }}>
        {saving ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}><Spinner color={Colors.orange} size={32} /></div>
        ) : (
          <BtnPrimary label="Guardar Rutina" onClick={() => handleSave()} fullWidth />
        )}
      </div>

      {/* Modal galería de GIFs */}
      {gifModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
          <div style={{
            width: '100%', backgroundColor: Colors.bgCard, borderRadius: '20px 20px 0 0',
            display: 'flex', flexDirection: 'column',
            height: '88vh', maxHeight: '88vh', overflow: 'hidden',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}>
            {/* Header */}
            <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.bgPlaceholder, position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)' }} />
              <div style={{ marginTop: 6 }}>
                <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 17, color: Colors.white }}>SELECCIONAR GIF</div>
                <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.orange, marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>{gifModal.name}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                {gifModal.currentUrl && (
                  <button
                    onClick={() => { updateGifUrl(gifModal.dayIdx, gifModal.exId, ''); setGifModal(null); }}
                    style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Quitar GIF
                  </button>
                )}
                <button onClick={() => setGifModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <X color={Colors.gray} size={20} />
                </button>
              </div>
            </div>

            {/* Muscle group tabs */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 20px 12px', flexShrink: 0, scrollbarWidth: 'none' }}>
              {(gifItems.length > 0 ? [...new Set(gifItems.map(g => g.muscle))] : GIF_MUSCLES).map((m) => (
                <button
                  key={m}
                  onClick={() => setGifActiveTab(m)}
                  style={{
                    whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    backgroundColor: gifActiveTab === m ? Colors.orange : Colors.bgElevated,
                    fontFamily: Fonts.heading, fontWeight: 700, fontSize: 11,
                    color: gifActiveTab === m ? Colors.blackText : Colors.gray,
                    letterSpacing: 0.3, flexShrink: 0,
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* GIF grid */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '0 16px 16px', alignContent: 'start' }}>
                {gifLoading ? (
                  <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: 32 }}>
                    <Spinner color={Colors.orange} size={28} />
                  </div>
                ) : gifItems.filter((g) => g.muscle === gifActiveTab).map((gif) => {
                  const isSelected = gifModal.currentUrl === gif.url;
                  return (
                    <button
                      key={gif.id}
                      onClick={() => { updateGifUrl(gifModal.dayIdx, gifModal.exId, gif.url); setGifModal(null); }}
                      style={{
                        aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: 'none', cursor: 'pointer', padding: 0,
                        outline: isSelected ? `3px solid ${Colors.orange}` : 'none',
                        outlineOffset: 2, position: 'relative',
                      }}
                    >
                      <img
                        src={gif.url}
                        alt=""
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      {isSelected && (
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: Colors.orange + '40', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.orange, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: Colors.blackText, fontSize: 14, fontWeight: 700 }}>✓</span>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de salida */}
      {showExitModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
          <div style={{
            width: '100%', backgroundColor: Colors.bgCard, borderRadius: '20px 20px 0 0',
            padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.bgPlaceholder, alignSelf: 'center', marginBottom: 8 }} />
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.white }}>¿SALIR DE LA RUTINA?</span>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, lineHeight: 1.6 }}>
              Tienes cambios sin guardar. ¿Qué deseas hacer?
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <button
                onClick={handleModalSaveAndLeave}
                disabled={saving}
                style={{ height: 52, borderRadius: Radius.lg, backgroundColor: Colors.orange, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.blackText, letterSpacing: 0.5 }}
              >
                {saving ? 'GUARDANDO...' : 'GUARDAR Y SALIR'}
              </button>
              <button
                onClick={handleModalLeaveWithoutSave}
                style={{ height: 52, borderRadius: Radius.lg, backgroundColor: Colors.bgElevated, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.gray, letterSpacing: 0.5 }}
              >
                SALIR SIN GUARDAR
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                style={{ height: 52, borderRadius: Radius.lg, backgroundColor: 'transparent', border: `1px solid ${Colors.bgElevated}`, cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white, letterSpacing: 0.5 }}
              >
                CONTINUAR EDITANDO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
