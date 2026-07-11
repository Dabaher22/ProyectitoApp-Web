import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, X, Search, Timer } from 'lucide-react';
import ScreenHeader from '../../components/ScreenHeader';
import BtnPrimary from '../../components/BtnPrimary';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { saveRoutineDraft, getRoutineDraft } from '../../store/routineDraft';

/* ─── Types ─────────────────────────────────────────── */
export interface ExerciseEntry {
  id: string;
  name: string;
  muscle: string;
  gifUrl?: string;
  supersetGroupId?: string;
  type?: 'exercise' | 'cardio';
  durationMinutes?: number;
}

export interface DayConfig {
  number: string;
  name: string;
  exercises: ExerciseEntry[];
}

/* ─── Muscle groups ──────────────────────────────────── */
const MUSCLES = ['BRAZOS', 'PIERNAS', 'PECHO', 'ESPALDA', 'HOMBROS', 'CORE', 'GLÚTEOS'];
const MUSCLE_COLORS: Record<string, string> = {
  BRAZOS: '#FF6B35', PIERNAS: '#00D4AA', PECHO: '#a78bfa',
  ESPALDA: '#60a5fa', HOMBROS: '#f472b6', CORE: '#facc15', GLÚTEOS: '#fb923c',
};

/* ─── Static exercise library ────────────────────────── */
const STATIC_EXERCISES: ExerciseEntry[] = [
  { id: 's1',  name: 'Press de Banca',           muscle: 'PECHO'    },
  { id: 's2',  name: 'Aperturas con Mancuernas', muscle: 'PECHO'    },
  { id: 's3',  name: 'Press Inclinado',           muscle: 'PECHO'    },
  { id: 's4',  name: 'Dominadas',                 muscle: 'ESPALDA'  },
  { id: 's5',  name: 'Remo con Barra',            muscle: 'ESPALDA'  },
  { id: 's6',  name: 'Jalón al Pecho',            muscle: 'ESPALDA'  },
  { id: 's7',  name: 'Remo en Polea',             muscle: 'ESPALDA'  },
  { id: 's8',  name: 'Press Militar',             muscle: 'HOMBROS'  },
  { id: 's9',  name: 'Elevaciones Laterales',     muscle: 'HOMBROS'  },
  { id: 's10', name: 'Curl de Bíceps',            muscle: 'BRAZOS'   },
  { id: 's11', name: 'Curl Martillo',             muscle: 'BRAZOS'   },
  { id: 's12', name: 'Extensión de Tríceps',      muscle: 'BRAZOS'   },
  { id: 's13', name: 'Fondos en Paralelas',       muscle: 'BRAZOS'   },
  { id: 's14', name: 'Sentadilla',                muscle: 'PIERNAS'  },
  { id: 's15', name: 'Peso Muerto',               muscle: 'PIERNAS'  },
  { id: 's16', name: 'Prensa de Piernas',         muscle: 'PIERNAS'  },
  { id: 's17', name: 'Curl de Isquiotibiales',    muscle: 'PIERNAS'  },
  { id: 's18', name: 'Hip Thrust',                muscle: 'GLÚTEOS'  },
  { id: 's19', name: 'Plancha',                   muscle: 'CORE'     },
  { id: 's20', name: 'Abdominales',               muscle: 'CORE'     },
  { id: 's21', name: 'Elevación de Piernas',      muscle: 'CORE'     },
];

/* ─── localStorage helpers ───────────────────────────── */
const LS_KEY = 'proyectito_saved_exercises';

function getSavedExercises(): ExerciseEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
}

export function saveExercisesToStorage(exercises: ExerciseEntry[]) {
  const current = getSavedExercises();
  const merged = [...current];
  exercises.forEach((e) => {
    if (e.name.trim() && !merged.find((m) => m.name.toLowerCase() === e.name.toLowerCase())) {
      merged.push({ id: `u_${Date.now()}_${Math.random()}`, name: e.name.trim(), muscle: e.muscle });
    }
  });
  localStorage.setItem(LS_KEY, JSON.stringify(merged));
}

function newEntry(): ExerciseEntry {
  return { id: `e_${Date.now()}_${Math.random()}`, name: '', muscle: '' };
}

/* ─── Suggestion dropdown ────────────────────────────── */
function SuggestionPanel({
  search, onSelect, filterMuscle,
}: { search: string; onSelect: (e: ExerciseEntry) => void; filterMuscle: string }) {
  const saved = getSavedExercises();
  const all = [
    ...saved.filter((s) => !STATIC_EXERCISES.find((x) => x.name.toLowerCase() === s.name.toLowerCase())),
    ...STATIC_EXERCISES,
  ];
  const filtered = all.filter((e) => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = !filterMuscle || e.muscle === filterMuscle;
    return matchSearch && matchMuscle;
  });

  if (filtered.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
      backgroundColor: Colors.bgElevated, borderRadius: Radius.md,
      border: `1px solid ${Colors.bgPlaceholder}`, maxHeight: 200,
      overflowY: 'auto', marginTop: 4,
    }}>
      {filtered.slice(0, 12).map((e) => (
        <button key={e.id} onClick={() => onSelect(e)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: `${Spacing.sm}px ${Spacing.md}px`,
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          borderBottom: `1px solid ${Colors.bgPage}`,
        }}
          onMouseEnter={(ev) => (ev.currentTarget.style.backgroundColor = Colors.bgPlaceholder)}
          onMouseLeave={(ev) => (ev.currentTarget.style.backgroundColor = 'transparent')}
        >
          <span style={{ fontFamily: Fonts.mono, fontSize: 13, color: Colors.white }}>{e.name}</span>
          {e.muscle && (
            <span style={{
              fontFamily: Fonts.mono, fontWeight: 700, fontSize: 9, letterSpacing: 0.5,
              color: MUSCLE_COLORS[e.muscle] ?? Colors.gray,
              backgroundColor: (MUSCLE_COLORS[e.muscle] ?? Colors.gray) + '20',
              borderRadius: Radius.full, padding: '2px 8px',
            }}>{e.muscle}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ─── Exercise row ───────────────────────────────────── */
function ExerciseRow({
  entry, onChange, onRemove,
}: { entry: ExerciseEntry; onChange: (updated: ExerciseEntry) => void; onRemove: () => void }) {
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div style={{ display: 'flex', gap: Spacing.sm, alignItems: 'flex-start' }}>
      {/* Name input + suggestions */}
      <div ref={wrapRef} style={{ flex: 1, position: 'relative' }}>
        <input
          value={entry.name}
          onChange={(e) => onChange({ ...entry, name: e.target.value })}
          onFocus={() => { setFocused(true); setShowSuggestions(true); }}
          onBlur={() => setFocused(false)}
          placeholder="Nombre del ejercicio"
          style={{
            width: '100%', height: 42, backgroundColor: Colors.bgPage,
            borderRadius: Radius.sm, paddingLeft: Spacing.sm, paddingRight: Spacing.sm,
            fontFamily: Fonts.mono, fontSize: 13, color: Colors.white,
            border: `1px solid ${focused ? Colors.orange : Colors.bgPlaceholder}`,
            outline: 'none', transition: 'border-color 0.15s',
          }}
        />
        {showSuggestions && (
          <SuggestionPanel
            search={entry.name}
            filterMuscle={entry.muscle}
            onSelect={(sel) => {
              onChange({ ...entry, name: sel.name, muscle: sel.muscle });
              setShowSuggestions(false);
            }}
          />
        )}
      </div>

      {/* Muscle selector */}
      <select
        value={entry.muscle}
        onChange={(e) => onChange({ ...entry, muscle: e.target.value })}
        style={{
          height: 42, backgroundColor: entry.muscle ? (MUSCLE_COLORS[entry.muscle] + '25') : Colors.bgPage,
          borderRadius: Radius.sm, paddingLeft: Spacing.sm, paddingRight: Spacing.sm,
          fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11,
          color: entry.muscle ? (MUSCLE_COLORS[entry.muscle] ?? Colors.white) : Colors.gray,
          border: `1px solid ${entry.muscle ? (MUSCLE_COLORS[entry.muscle] + '80') : Colors.bgPlaceholder}`,
          outline: 'none', cursor: 'pointer', width: 110, flexShrink: 0,
        }}
      >
        <option value="">Músculo</option>
        {MUSCLES.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>

      {/* Remove */}
      <button onClick={onRemove} style={{
        width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none', border: `1px solid ${Colors.bgPlaceholder}`,
        borderRadius: Radius.sm, cursor: 'pointer', flexShrink: 0,
      }}>
        <X color={Colors.gray} size={16} />
      </button>
    </div>
  );
}

/* ─── Súper-serie block (bi-serie de 2 o tri-serie de 3) ─── */
function SupersetBlock({
  exercises, onChange, onDissolve,
}: {
  exercises: ExerciseEntry[];
  onChange: (memberIdx: number, e: ExerciseEntry) => void;
  onDissolve: () => void;
}) {
  const label = exercises.length >= 3 ? 'TRI-SERIE' : 'BI-SERIE';
  return (
    <div style={{
      backgroundColor: Colors.bgCard, borderRadius: Radius.md,
      border: `1px solid ${Colors.orange}50`,
      display: 'flex', flexDirection: 'column', gap: Spacing.sm, padding: Spacing.sm,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 10, color: Colors.orange, letterSpacing: 1 }}>
          {label}
        </span>
        <button onClick={onDissolve} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer',
        }}>
          <X color={Colors.gray} size={12} />
          <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>quitar</span>
        </button>
      </div>
      {exercises.map((ex, i) => (
        <React.Fragment key={ex.id}>
          {i > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
              <div style={{ width: 2, height: 18, backgroundColor: Colors.orange + '60', borderRadius: 1 }} />
              <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.orange, letterSpacing: 0.5 }}>SEGUIDO DE</span>
            </div>
          )}
          <ExerciseRow entry={ex} onChange={(u) => onChange(i, u)} onRemove={onDissolve} />
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─── Main screen ────────────────────────────────────── */
export default function ExerciseSelectionScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const uid = useAuthStore((s) => s.uid)!;
  const state = location.state as {
    routineId: string; routineName?: string; days?: string[]; type?: string;
    initialDayConfigs?: DayConfig[];
    macrocycleId?: string; mesocycleId?: string; weekNumber?: number;
  } | null;

  // Always read draft — used as fallback even when state exists but lacks initialDayConfigs
  // (e.g. navigating back from SetsRepsConfigScreen restores the original state without exercises)
  const draft = getRoutineDraft(uid);
  const effectiveRoutineId = state?.routineId ?? draft?.routineId ?? 'new';
  const effectiveName = state?.routineName ?? draft?.routineName ?? '';
  const effectiveDays = state?.days ?? draft?.days ?? [];
  const effectiveType = state?.type ?? draft?.routineType ?? '';
  const effectiveInitialDayConfigs = state?.initialDayConfigs ?? draft?.dayConfigs;

  const dayNumbers = effectiveDays;

  const [dayConfigs, setDayConfigs] = useState<DayConfig[]>(
    effectiveInitialDayConfigs ??
    dayNumbers.map((n) => ({ number: n, name: '', exercises: [] }))
  );
  const [activeDay, setActiveDay] = useState(0);
  const [showCardioModal, setShowCardioModal] = useState(false);
  const [cardioName, setCardioName] = useState('');
  const [cardioDuration, setCardioDuration] = useState(20);

  const addCardio = (dayIdx: number) => {
    if (!cardioName.trim()) return;
    const entry: ExerciseEntry = {
      id: `cardio_${Date.now()}_${Math.random()}`,
      name: cardioName.trim(),
      muscle: '',
      type: 'cardio',
      durationMinutes: cardioDuration,
    };
    updateDay(dayIdx, { exercises: [...dayConfigs[dayIdx].exercises, entry] });
    setCardioName('');
    setCardioDuration(20);
    setShowCardioModal(false);
  };

  useEffect(() => {
    if (dayNumbers.length === 0) return;
    saveRoutineDraft(uid, {
      step: 2,
      routineId: effectiveRoutineId,
      routineName: effectiveName,
      routineType: effectiveType,
      days: dayNumbers,
      dayConfigs,
    });
  }, [dayConfigs]);

  const updateDay = (idx: number, patch: Partial<DayConfig>) => {
    setDayConfigs((prev) => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));
  };

  const addExercise = (dayIdx: number) => {
    const day = dayConfigs[dayIdx];
    updateDay(dayIdx, { exercises: [...day.exercises, newEntry()] });
  };

  const updateExercise = (dayIdx: number, exIdx: number, updated: ExerciseEntry) => {
    const exs = [...dayConfigs[dayIdx].exercises];
    exs[exIdx] = updated;
    updateDay(dayIdx, { exercises: exs });
  };

  const removeExercise = (dayIdx: number, exIdx: number) => {
    const exs = dayConfigs[dayIdx].exercises.filter((_, i) => i !== exIdx);
    updateDay(dayIdx, { exercises: exs });
  };

  const addSuperserie = (dayIdx: number, exIdx: number, size: 2 | 3) => {
    const groupId = `bs_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const exs = [...dayConfigs[dayIdx].exercises];
    exs[exIdx] = { ...exs[exIdx], supersetGroupId: groupId };
    const partners = Array.from({ length: size - 1 }, () => ({ ...newEntry(), supersetGroupId: groupId }));
    exs.splice(exIdx + 1, 0, ...partners);
    updateDay(dayIdx, { exercises: exs });
  };

  const removeSuperserie = (dayIdx: number, exIdx: number) => {
    const exs = [...dayConfigs[dayIdx].exercises];
    const groupId = exs[exIdx].supersetGroupId;
    exs[exIdx] = { ...exs[exIdx], supersetGroupId: undefined };
    // Quita a todos los compañeros que sigan compartiendo el mismo groupId
    while (exs[exIdx + 1]?.supersetGroupId === groupId) {
      exs.splice(exIdx + 1, 1);
    }
    updateDay(dayIdx, { exercises: exs });
  };

  const canContinue = dayConfigs.every((d) => d.exercises.length > 0);

  const handleContinue = () => {
    const allEntries = dayConfigs.flatMap((d) => d.exercises.filter((e) => e.name.trim()));
    saveExercisesToStorage(allEntries);

    navigate('/coach/sets-reps', {
      state: {
        dayConfigs,
        routineId: effectiveRoutineId,
        routineName: effectiveName,
        type: effectiveType,
        ...(state?.macrocycleId ? {
          macrocycleId: state.macrocycleId,
          mesocycleId: state.mesocycleId,
          weekNumber: state.weekNumber,
        } : {}),
      },
    });
  };

  const current = dayConfigs[activeDay];

  return (
    <div className="screen-full" style={{ display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader title={effectiveName || 'EJERCICIOS'} onBack={() => navigate(-1)} />

      {/* Day tabs */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: `${Spacing.sm}px ${Spacing.lg}px 0`, borderBottom: `1px solid ${Colors.bgElevated}` }}>
        {dayConfigs.map((d, i) => (
          <button key={d.number} onClick={() => setActiveDay(i)} style={{
            paddingLeft: 16, paddingRight: 16, paddingTop: 8, paddingBottom: 10,
            background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, letterSpacing: 0.5,
            color: activeDay === i ? Colors.orange : Colors.gray,
            borderBottom: `2px solid ${activeDay === i ? Colors.orange : 'transparent'}`,
            transition: 'color 0.15s',
          }}>
            DÍA {d.number}
            {d.exercises.length > 0 && (
              <span style={{ marginLeft: 6, backgroundColor: Colors.orange, borderRadius: 8, padding: '1px 5px', fontSize: 9, color: Colors.blackText }}>
                {d.exercises.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Day content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
        {/* Day name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
          <label style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Nombre del día {current.number}
          </label>
          <input
            value={current.name}
            onChange={(e) => updateDay(activeDay, { name: e.target.value })}
            placeholder="Ej. Pecho y Tríceps, Empuje, Piernas..."
            style={{
              height: 46, backgroundColor: Colors.bgElevated, borderRadius: Radius.md,
              paddingLeft: Spacing.md, paddingRight: Spacing.md,
              fontFamily: Fonts.mono, fontSize: 13, color: Colors.white,
              border: `1px solid ${Colors.bgPlaceholder}`, outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = Colors.orange)}
            onBlur={(e) => (e.target.style.borderColor = Colors.bgPlaceholder)}
          />
        </div>

        {/* Exercises label */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Ejercicios ({current.exercises.length})
          </span>
          <div style={{ display: 'flex', gap: 6, fontSize: 10, color: Colors.gray, fontFamily: Fonts.mono }}>
            <span>Nombre</span>
            <span style={{ width: 110, textAlign: 'center' }}>Músculo</span>
            <span style={{ width: 42 }} />
          </div>
        </div>

        {/* Exercise rows */}
        {current.exercises.length === 0 ? (
          <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.xl, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Spacing.sm }}>
            <Search color={Colors.gray} size={28} />
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white }}>Sin ejercicios</span>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>Agrega ejercicios para el Día {current.number}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            {(() => {
              const items: React.ReactNode[] = [];
              const exs = current.exercises;
              let i = 0;
              while (i < exs.length) {
                const ex = exs[i];
                if (ex.supersetGroupId) {
                  const idx = i;
                  let runLen = 1;
                  while (exs[idx + runLen]?.supersetGroupId === ex.supersetGroupId) runLen++;
                  const groupExs = exs.slice(idx, idx + runLen);
                  items.push(
                    <SupersetBlock
                      key={ex.id}
                      exercises={groupExs}
                      onChange={(memberIdx, u) => updateExercise(activeDay, idx + memberIdx, u)}
                      onDissolve={() => removeSuperserie(activeDay, idx)}
                    />
                  );
                  i += runLen;
                } else if (ex.type === 'cardio') {
                  const idx = i;
                  items.push(
                    <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: `${Spacing.sm}px ${Spacing.md}px`, border: `1px solid ${Colors.teal}40` }}>
                      <Timer color={Colors.teal} size={16} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white }}>{ex.name}</span>
                        <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.teal, marginLeft: 8 }}>{ex.durationMinutes} min</span>
                      </div>
                      <button onClick={() => removeExercise(activeDay, idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                        <X color={Colors.gray} size={14} />
                      </button>
                    </div>
                  );
                  i++;
                } else {
                  const idx = i;
                  items.push(
                    <div key={ex.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <ExerciseRow
                        entry={ex}
                        onChange={(u) => updateExercise(activeDay, idx, u)}
                        onRemove={() => removeExercise(activeDay, idx)}
                      />
                      {!ex.supersetGroupId && (
                        <div style={{ display: 'flex', flexDirection: 'row', gap: 6, marginLeft: 4 }}>
                          <button onClick={() => addSuperserie(activeDay, idx, 2)} style={{
                            alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4,
                            background: 'none', border: `1px solid ${Colors.orange}40`,
                            borderRadius: Radius.full, padding: '3px 10px', cursor: 'pointer',
                          }}>
                            <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.orange }}>+ BI-SERIE</span>
                          </button>
                          <button onClick={() => addSuperserie(activeDay, idx, 3)} style={{
                            alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4,
                            background: 'none', border: `1px solid ${Colors.orange}40`,
                            borderRadius: Radius.full, padding: '3px 10px', cursor: 'pointer',
                          }}>
                            <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.orange }}>+ TRI-SERIE</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                  i++;
                }
              }
              return items;
            })()}
          </div>
        )}

        {/* Add exercise / cardio buttons */}
        <div style={{ display: 'flex', gap: Spacing.sm }}>
          <button onClick={() => addExercise(activeDay)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
            height: 44, backgroundColor: Colors.bgCard,
            borderRadius: Radius.md, border: `1px dashed ${Colors.bgPlaceholder}`,
            cursor: 'pointer',
          }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = Colors.orange)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = Colors.bgPlaceholder)}
          >
            <Plus color={Colors.orange} size={18} />
            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.orange }}>EJERCICIO</span>
          </button>
          <button onClick={() => setShowCardioModal(true)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
            height: 44, backgroundColor: Colors.bgCard,
            borderRadius: Radius.md, border: `1px dashed ${Colors.teal}60`,
            cursor: 'pointer',
          }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = Colors.teal)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${Colors.teal}60`)}
          >
            <Timer color={Colors.teal} size={18} />
            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.teal }}>CARDIO</span>
          </button>
        </div>

        {/* Progress across days */}
        <div style={{ display: 'flex', gap: Spacing.xs, marginTop: Spacing.sm }}>
          {dayConfigs.map((d, i) => (
            <div key={d.number} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ height: 4, width: '100%', borderRadius: 2, backgroundColor: d.exercises.length > 0 ? Colors.teal : Colors.bgElevated }} />
              <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: i === activeDay ? Colors.orange : Colors.gray }}>D{d.number}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: Spacing.lg, backgroundColor: Colors.bgCard, borderTop: `1px solid ${Colors.bgElevated}`, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
        {!canContinue && (
          <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, textAlign: 'center' }}>
            Agrega al menos un ejercicio o cardio por cada día
          </span>
        )}
        <BtnPrimary label="Continuar →" onClick={handleContinue} fullWidth disabled={!canContinue} />
      </div>

      {/* Cardio modal — zIndex 1000 para estar encima del bottom nav (zIndex 100) */}
      {showCardioModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', zIndex: 1000 }}>
          <div style={{ width: '100%', backgroundColor: Colors.bgCard, borderRadius: '20px 20px 0 0', padding: `24px 20px calc(20px + env(safe-area-inset-bottom))`, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.bgPlaceholder, alignSelf: 'center', marginBottom: 4 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
              <Timer color={Colors.teal} size={20} />
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.white }}>AGREGAR CARDIO</span>
            </div>

            {/* Nombre actividad */}
            <div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5, marginBottom: 6 }}>ACTIVIDAD</div>
              <input
                value={cardioName}
                onChange={(e) => setCardioName(e.target.value)}
                placeholder="Caminadora, Bicicleta, Elíptica..."
                style={{ width: '100%', height: 48, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: `1px solid ${Colors.teal}60`, padding: '0 12px', fontFamily: Fonts.mono, fontSize: 16, color: Colors.white, outline: 'none', boxSizing: 'border-box' }}
                onFocus={(e) => (e.target.style.borderColor = Colors.teal)}
                onBlur={(e) => (e.target.style.borderColor = `${Colors.teal}60`)}
              />
            </div>

            {/* Duración con +/− sin teclado */}
            <div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5, marginBottom: 8 }}>DURACIÓN (minutos)</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg }}>
                <button onClick={() => setCardioDuration((d) => Math.max(5, d - 5))} style={{ width: 48, height: 48, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: 'none', cursor: 'pointer', fontSize: 22, color: Colors.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 40, color: Colors.teal, minWidth: 80, textAlign: 'center' }}>{cardioDuration}</span>
                <button onClick={() => setCardioDuration((d) => d + 5)} style={{ width: 48, height: 48, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: 'none', cursor: 'pointer', fontSize: 22, color: Colors.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => { setShowCardioModal(false); setCardioName(''); setCardioDuration(20); }} style={{ flex: 1, height: 52, backgroundColor: Colors.bgElevated, borderRadius: Radius.lg, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.gray }}>
                CANCELAR
              </button>
              <button onClick={() => addCardio(activeDay)} disabled={!cardioName.trim()} style={{ flex: 2, height: 52, backgroundColor: cardioName.trim() ? Colors.teal : Colors.bgElevated, borderRadius: Radius.lg, border: 'none', cursor: cardioName.trim() ? 'pointer' : 'default', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: cardioName.trim() ? Colors.blackText : Colors.gray }}>
                AGREGAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
