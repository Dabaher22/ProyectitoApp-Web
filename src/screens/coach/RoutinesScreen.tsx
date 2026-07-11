import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ClipboardList, Plus, Trash2, Pencil, PlayCircle, X, Repeat, Zap, Users } from 'lucide-react';
import ScreenHeader from '../../components/ScreenHeader';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { getRoutinesByCoach, deleteRoutine, Routine } from '../../services/routines';
import { getCircuitsByCoach, deleteCircuit, Circuit } from '../../services/circuits';
import { useAuthStore } from '../../store/authStore';
import { getRoutineDraft, clearRoutineDraft, RoutineDraft } from '../../store/routineDraft';
import type { DayConfig, ExerciseEntry } from './ExerciseSelectionScreen';

const CIRCUIT_COLOR = '#B980FF';

type Tab = 'routines' | 'circuits';

function buildDayConfigsFromRoutine(r: Routine): DayConfig[] {
  const dayMap = new Map<string, ExerciseEntry[]>();
  for (const e of r.exercises) {
    const day = (e as any).day ?? r.days[0] ?? 'Día 1';
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day)!.push({ ...e } as ExerciseEntry);
  }
  return r.days.map((dayName, i) => ({
    number: String(i + 1),
    name: dayName,
    exercises: dayMap.get(dayName) ?? [],
  }));
}

export default function RoutinesScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { uid } = useAuthStore();

  const [tab, setTab] = useState<Tab>(location.pathname.includes('circuit') ? 'circuits' : 'routines');

  // Rutinas
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loadingRoutines, setLoadingRoutines] = useState(true);
  const [draft, setDraft] = useState<RoutineDraft | null>(() =>
    uid ? getRoutineDraft(uid) : null
  );

  // Circuitos
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [loadingCircuits, setLoadingCircuits] = useState(true);

  const loadRoutines = async () => {
    if (!uid) return;
    setLoadingRoutines(true);
    try {
      setRoutines(await getRoutinesByCoach(uid));
    } catch (err) {
      console.error('Error cargando rutinas:', err);
    } finally {
      setLoadingRoutines(false);
    }
  };

  const loadCircuits = async () => {
    if (!uid) return;
    setLoadingCircuits(true);
    try {
      setCircuits(await getCircuitsByCoach(uid));
    } catch (err) {
      console.error('Error cargando circuitos:', err);
    } finally {
      setLoadingCircuits(false);
    }
  };

  useEffect(() => { loadRoutines(); loadCircuits(); }, [uid]);

  const switchTab = (t: Tab) => {
    setTab(t);
    navigate(t === 'routines' ? '/coach/routines' : '/coach/circuits', { replace: true });
  };

  const discardDraft = () => {
    if (uid) clearRoutineDraft(uid);
    setDraft(null);
  };

  const resumeDraft = () => {
    if (!draft) return;
    if (draft.step === 3) {
      navigate('/coach/sets-reps', {
        state: {
          dayConfigs: draft.dayConfigs,
          routineId: draft.routineId,
          routineName: draft.routineName,
          type: draft.routineType,
          fromDraftResume: true,
        },
      });
    } else {
      navigate('/coach/exercise-selection', {
        state: {
          routineId: draft.routineId,
          routineName: draft.routineName,
          days: draft.days,
          type: draft.routineType,
          initialDayConfigs: draft.dayConfigs,
        },
      });
    }
  };

  const draftStepLabel = draft?.step === 3 ? 'Configurando series y reps' : 'Seleccionando ejercicios';
  const draftExerciseCount = draft?.step === 3
    ? (draft.dayConfigs as any[]).reduce((acc: number, d: any) => acc + (d.exercises?.length ?? 0), 0)
    : 0;

  const handleDeleteRoutine = async (id: string) => {
    if (!confirm('¿Eliminar esta rutina?')) return;
    await deleteRoutine(id);
    setRoutines((prev) => prev.filter((r) => r.id !== id));
  };

  const handleEditRoutine = (r: Routine) => {
    navigate('/coach/create-routine', {
      state: {
        editMode: true,
        routineId: r.id,
        routineName: r.name,
        routineType: r.type,
        routineDayCount: r.days.length,
        dayConfigs: buildDayConfigsFromRoutine(r),
      },
    });
  };

  const handleDeleteCircuit = async (id: string) => {
    if (!confirm('¿Eliminar este circuito?')) return;
    await deleteCircuit(id);
    setCircuits((prev) => prev.filter((c) => c.id !== id));
  };

  const handleEditCircuit = (c: Circuit) => {
    navigate('/coach/create-circuit', { state: c });
  };

  const handleAssignCircuit = (c: Circuit) => {
    navigate('/coach/clients', { state: { assignCircuitId: c.id, assignCircuitName: c.name } });
  };

  const tabColor = tab === 'routines' ? Colors.orange : CIRCUIT_COLOR;

  return (
    <div>
      <ScreenHeader
        title={tab === 'routines' ? 'MIS RUTINAS' : 'MIS CIRCUITOS'}
        right={
          tab === 'routines' ? (
            <button onClick={() => navigate('/coach/create-routine')} style={{
              backgroundColor: Colors.orange, borderRadius: Radius.md, height: 36, paddingLeft: 14, paddingRight: 14,
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: Spacing.xs,
            }}>
              <Plus size={16} color={Colors.blackText} />
              <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.blackText }}>NUEVA</span>
            </button>
          ) : (
            <button onClick={() => navigate('/coach/create-circuit')} style={{
              backgroundColor: CIRCUIT_COLOR, borderRadius: Radius.md, height: 36, paddingLeft: 14, paddingRight: 14,
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: Spacing.xs,
            }}>
              <Plus size={16} color={Colors.white} />
              <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.white }}>NUEVO</span>
            </button>
          )
        }
      />

      {/* Selector Rutinas / Circuitos */}
      <div style={{ padding: `${Spacing.md}px ${Spacing.lg}px 0` }}>
        <div style={{ display: 'flex', backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: 4, gap: 4 }}>
          <button
            onClick={() => switchTab('routines')}
            style={{
              flex: 1, height: 38, borderRadius: Radius.sm, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              backgroundColor: tab === 'routines' ? Colors.orange : 'transparent',
              transition: 'background-color 0.15s',
            }}
          >
            <ClipboardList size={14} color={tab === 'routines' ? Colors.blackText : Colors.gray} />
            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, letterSpacing: 0.5, color: tab === 'routines' ? Colors.blackText : Colors.gray }}>RUTINAS</span>
          </button>
          <button
            onClick={() => switchTab('circuits')}
            style={{
              flex: 1, height: 38, borderRadius: Radius.sm, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              backgroundColor: tab === 'circuits' ? CIRCUIT_COLOR : 'transparent',
              transition: 'background-color 0.15s',
            }}
          >
            <Repeat size={14} color={tab === 'circuits' ? Colors.white : Colors.gray} />
            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, letterSpacing: 0.5, color: tab === 'circuits' ? Colors.white : Colors.gray }}>CIRCUITOS</span>
          </button>
        </div>
      </div>

      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
        {tab === 'routines' ? (
          <>
            {/* Borrador en progreso */}
            {draft && (
              <div style={{ backgroundColor: Colors.orange + '15', border: `1px solid ${Colors.orange}50`, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', alignItems: 'center', gap: Spacing.md }}>
                <div style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.orange + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <PlayCircle color={Colors.orange} size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.orange, letterSpacing: 0.5 }}>BORRADOR EN PROGRESO</div>
                  <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white, textTransform: 'uppercase', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{draft.routineName || 'Sin nombre'}</div>
                  <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>
                    {draftStepLabel}{draft.step === 3 && draftExerciseCount > 0 ? ` · ${draftExerciseCount} ejercicios` : ''}
                  </div>
                </div>
                <button
                  onClick={resumeDraft}
                  style={{ backgroundColor: Colors.orange, borderRadius: Radius.md, padding: '8px 14px', border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 12, color: Colors.blackText, letterSpacing: 0.5, flexShrink: 0 }}
                >
                  CONTINUAR
                </button>
                <button onClick={discardDraft} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}>
                  <X color={Colors.gray} size={16} />
                </button>
              </div>
            )}

            {loadingRoutines ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><Spinner color={Colors.orange} size={32} /></div>
            ) : routines.length === 0 ? (
              <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.xl, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Spacing.md }}>
                <ClipboardList color={Colors.gray} size={40} />
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.white }}>Sin rutinas</span>
                <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>Crea tu primera rutina para empezar a asignarla a tus asesorados.</span>
                <button onClick={() => navigate('/coach/create-routine')} style={{
                  backgroundColor: Colors.orange, borderRadius: Radius.md, height: 44, paddingLeft: 20, paddingRight: 20,
                  border: 'none', cursor: 'pointer', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.blackText,
                }}>+ CREAR RUTINA</button>
              </div>
            ) : (
              routines.map((r) => (
                <div key={r.id} style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 40, height: 40, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ClipboardList color={Colors.orange} size={20} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                        <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>{r.type} · {r.days.length} días · {r.exercises.length} ejercicios</div>
                      </div>
                    </div>
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => handleEditRoutine(r)} style={{ background: 'none', border: `1px solid ${Colors.bgElevated}`, borderRadius: Radius.sm, cursor: 'pointer', padding: 7, display: 'flex', alignItems: 'center' }}>
                        <Pencil color={Colors.teal} size={16} />
                      </button>
                      <button onClick={() => handleDeleteRoutine(r.id)} style={{ background: 'none', border: `1px solid ${Colors.bgElevated}`, borderRadius: Radius.sm, cursor: 'pointer', padding: 7, display: 'flex', alignItems: 'center' }}>
                        <Trash2 color={Colors.gray} size={16} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: Spacing.xs, flexWrap: 'wrap' }}>
                    {r.days.map((d) => (
                      <span key={d} style={{ backgroundColor: Colors.orange + '20', border: `1px solid ${Colors.orange}40`, borderRadius: Radius.sm, padding: '2px 8px', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 10, color: Colors.orange }}>{d}</span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        ) : (
          <>
            {loadingCircuits ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
                <Spinner color={CIRCUIT_COLOR} size={32} />
              </div>
            ) : circuits.length === 0 ? (
              <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.xl, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Spacing.md }}>
                <Repeat color={Colors.gray} size={40} />
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.white }}>Sin circuitos</span>
                <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, lineHeight: 1.6 }}>Crea circuitos AMRAP o EMOM para asignarlos a tus asesorados.</span>
                <button onClick={() => navigate('/coach/create-circuit')} style={{
                  backgroundColor: CIRCUIT_COLOR, borderRadius: Radius.md, height: 44, paddingLeft: 20, paddingRight: 20,
                  border: 'none', cursor: 'pointer', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.white,
                }}>+ CREAR CIRCUITO</button>
              </div>
            ) : (
              circuits.map((c) => {
                const minutes = c.format === 'amrap' ? c.timeLimitMinutes : c.totalMinutes;
                const Icon = c.format === 'amrap' ? Repeat : Zap;
                return (
                  <div key={c.id} style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 40, height: 40, backgroundColor: CIRCUIT_COLOR + '15', borderRadius: Radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon color={CIRCUIT_COLOR} size={20} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                          <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>
                            {c.format.toUpperCase()} · {minutes} min · {c.exercises.length} ejercicios
                            {c.assignedTo?.length > 0 && ` · ${c.assignedTo.length} asignado${c.assignedTo.length > 1 ? 's' : ''}`}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => handleAssignCircuit(c)} style={{ background: 'none', border: `1px solid ${Colors.bgElevated}`, borderRadius: Radius.sm, cursor: 'pointer', padding: 7, display: 'flex', alignItems: 'center' }}>
                          <Users color={Colors.teal} size={16} />
                        </button>
                        <button onClick={() => handleEditCircuit(c)} style={{ background: 'none', border: `1px solid ${Colors.bgElevated}`, borderRadius: Radius.sm, cursor: 'pointer', padding: 7, display: 'flex', alignItems: 'center' }}>
                          <Pencil color={Colors.teal} size={16} />
                        </button>
                        <button onClick={() => handleDeleteCircuit(c.id)} style={{ background: 'none', border: `1px solid ${Colors.bgElevated}`, borderRadius: Radius.sm, cursor: 'pointer', padding: 7, display: 'flex', alignItems: 'center' }}>
                          <Trash2 color={Colors.gray} size={16} />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: Spacing.xs, flexWrap: 'wrap' }}>
                      {c.exercises.slice(0, 4).map((e) => (
                        <span key={e.id} style={{ backgroundColor: CIRCUIT_COLOR + '15', border: `1px solid ${CIRCUIT_COLOR}30`, borderRadius: Radius.sm, padding: '2px 8px', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 10, color: CIRCUIT_COLOR }}>
                          {e.name} ×{e.reps}
                        </span>
                      ))}
                      {c.exercises.length > 4 && (
                        <span style={{ backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, padding: '2px 8px', fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>+{c.exercises.length - 4}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
