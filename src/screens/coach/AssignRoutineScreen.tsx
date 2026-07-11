import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Check, ClipboardList, Repeat, Zap, X } from 'lucide-react';
import ScreenHeader from '../../components/ScreenHeader';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import {
  getRoutinesByCoach,
  getRoutinesByTrainee,
  assignRoutineToTrainee,
  unassignRoutineFromTrainee,
  Routine,
} from '../../services/routines';
import {
  getCircuitsByCoach,
  getCircuitsByTrainee,
  assignCircuitToTrainee,
  unassignCircuitFromTrainee,
  Circuit,
} from '../../services/circuits';
import { useAuthStore } from '../../store/authStore';

const CIRCUIT_COLOR = '#B980FF';

export default function AssignRoutineScreen() {
  const navigate = useNavigate();
  const { traineeId } = useParams<{ traineeId: string }>();
  const location = useLocation();
  const locationState = location.state as any;
  const traineeName = locationState?.traineeName ?? 'Asesorado';
  const defaultTab = locationState?.defaultTab ?? 'routines';
  const uid = useAuthStore((s) => s.uid)!;

  const [tab, setTab] = useState<'routines' | 'circuits'>(defaultTab);

  // Routines state
  const [coachRoutines, setCoachRoutines] = useState<Routine[]>([]);
  const [assignedRoutines, setAssignedRoutines] = useState<Routine[]>([]);
  const [savingRoutine, setSavingRoutine] = useState<string | null>(null);

  // Circuits state
  const [coachCircuits, setCoachCircuits] = useState<Circuit[]>([]);
  const [assignedCircuits, setAssignedCircuits] = useState<Circuit[]>([]);
  const [savingCircuit, setSavingCircuit] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!traineeId || !uid) return;
    const fetchAll = async () => {
      try {
        const [allRoutines, myRoutines, allCircuits, myCircuits] = await Promise.all([
          getRoutinesByCoach(uid),
          getRoutinesByTrainee(traineeId),
          getCircuitsByCoach(uid),
          getCircuitsByTrainee(traineeId),
        ]);
        setCoachRoutines(allRoutines);
        setAssignedRoutines(myRoutines);
        setCoachCircuits(allCircuits);
        setAssignedCircuits(myCircuits);
      } catch (e) {
        console.error('Error cargando datos:', e);
      }
      setLoading(false);
    };
    fetchAll();
  }, [uid, traineeId]);

  const handleAssignRoutine = async (routineId: string) => {
    if (!traineeId) return;
    setSavingRoutine(routineId);
    try {
      await assignRoutineToTrainee(routineId, traineeId);
      const r = coachRoutines.find((x) => x.id === routineId)!;
      setAssignedRoutines((prev) => [...prev, r]);
    } catch {
      alert('No se pudo asignar la rutina.');
    } finally {
      setSavingRoutine(null);
    }
  };

  const handleUnassignRoutine = async (routineId: string) => {
    if (!traineeId) return;
    setSavingRoutine(routineId);
    try {
      await unassignRoutineFromTrainee(routineId, traineeId);
      setAssignedRoutines((prev) => prev.filter((r) => r.id !== routineId));
    } catch {
      alert('No se pudo quitar la rutina.');
    } finally {
      setSavingRoutine(null);
    }
  };

  const handleAssignCircuit = async (circuitId: string) => {
    if (!traineeId) return;
    setSavingCircuit(circuitId);
    try {
      await assignCircuitToTrainee(circuitId, traineeId);
      const c = coachCircuits.find((x) => x.id === circuitId)!;
      setAssignedCircuits((prev) => [...prev, c]);
    } catch {
      alert('No se pudo asignar el circuito.');
    } finally {
      setSavingCircuit(null);
    }
  };

  const handleUnassignCircuit = async (circuitId: string) => {
    if (!traineeId) return;
    setSavingCircuit(circuitId);
    try {
      await unassignCircuitFromTrainee(circuitId, traineeId);
      setAssignedCircuits((prev) => prev.filter((c) => c.id !== circuitId));
    } catch {
      alert('No se pudo quitar el circuito.');
    } finally {
      setSavingCircuit(null);
    }
  };

  const unassignedRoutines = coachRoutines.filter((r) => !assignedRoutines.find((a) => a.id === r.id));
  const unassignedCircuits = coachCircuits.filter((c) => !assignedCircuits.find((a) => a.id === c.id));

  return (
    <div className="screen-full" style={{ display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader title={`ASIGNAR A ${traineeName.toUpperCase()}`} onBack={() => navigate(-1)} />

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${Colors.bgElevated}` }}>
        <button onClick={() => setTab('routines')} style={{ flex: 1, height: 44, background: 'none', border: 'none', cursor: 'pointer', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, letterSpacing: 0.5, color: tab === 'routines' ? Colors.orange : Colors.gray, borderBottom: `2px solid ${tab === 'routines' ? Colors.orange : 'transparent'}` }}>
          RUTINAS
        </button>
        <button onClick={() => setTab('circuits')} style={{ flex: 1, height: 44, background: 'none', border: 'none', cursor: 'pointer', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, letterSpacing: 0.5, color: tab === 'circuits' ? CIRCUIT_COLOR : Colors.gray, borderBottom: `2px solid ${tab === 'circuits' ? CIRCUIT_COLOR : 'transparent'}` }}>
          CIRCUITOS
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
          <Spinner color={Colors.orange} size={32} />
        </div>
      ) : tab === 'circuits' ? (
        /* ── Circuits tab ── */
        <div style={{ flex: 1, overflowY: 'auto', padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>

          {/* Circuitos asignados */}
          <div>
            <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: CIRCUIT_COLOR, letterSpacing: 0.5 }}>CIRCUITOS ACTIVOS</span>
            <div style={{ marginTop: Spacing.sm, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
              {assignedCircuits.length === 0 ? (
                <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, textAlign: 'center' }}>
                  <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>Sin circuitos asignados</span>
                </div>
              ) : (
                assignedCircuits.map((c) => {
                  const minutes = c.format === 'amrap' ? c.timeLimitMinutes : c.totalMinutes;
                  const Icon = c.format === 'amrap' ? Repeat : Zap;
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.md, border: `1px solid ${CIRCUIT_COLOR}40` }}>
                      <div style={{ width: 40, height: 40, backgroundColor: CIRCUIT_COLOR + '20', borderRadius: Radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon color={CIRCUIT_COLOR} size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white, textTransform: 'uppercase' }}>{c.name}</div>
                        <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>{c.format.toUpperCase()} · {minutes} min · {c.exercises.length} ejercicios</div>
                      </div>
                      <button
                        onClick={() => handleUnassignCircuit(c.id)}
                        disabled={savingCircuit === c.id}
                        style={{ width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.bgElevated, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      >
                        {savingCircuit === c.id ? <Spinner color={Colors.gray} size={14} /> : <X color={Colors.gray} size={14} />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Circuitos disponibles para asignar */}
          {unassignedCircuits.length > 0 && (
            <div>
              <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, letterSpacing: 0.5 }}>AGREGAR CIRCUITO</span>
              <div style={{ marginTop: Spacing.sm, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
                {unassignedCircuits.map((c) => {
                  const minutes = c.format === 'amrap' ? c.timeLimitMinutes : c.totalMinutes;
                  const Icon = c.format === 'amrap' ? Repeat : Zap;
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleAssignCircuit(c.id)}
                      disabled={savingCircuit === c.id}
                      style={{ display: 'flex', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.md, border: `1px solid transparent`, cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ width: 40, height: 40, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {savingCircuit === c.id ? <Spinner color={CIRCUIT_COLOR} size={16} /> : <Icon color={Colors.gray} size={18} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white, textTransform: 'uppercase' }}>{c.name}</div>
                        <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>{c.format.toUpperCase()} · {minutes} min · {c.exercises.length} ejercicios</div>
                      </div>
                      <Check color={CIRCUIT_COLOR} size={16} style={{ opacity: 0.4 }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {coachCircuits.length === 0 && (
            <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.lg, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
              <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>No tienes circuitos creados aún.</span>
              <button onClick={() => navigate('/coach/create-circuit')} style={{ height: 40, backgroundColor: CIRCUIT_COLOR, borderRadius: Radius.md, border: 'none', cursor: 'pointer', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.white }}>
                + CREAR CIRCUITO
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── Routines tab ── */
        <div style={{ flex: 1, overflowY: 'auto', padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>

          {/* Rutinas asignadas */}
          <div>
            <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.teal, letterSpacing: 0.5 }}>RUTINAS ASIGNADAS</span>
            <div style={{ marginTop: Spacing.sm, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
              {assignedRoutines.length === 0 ? (
                <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, textAlign: 'center' }}>
                  <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>Sin rutinas asignadas</span>
                </div>
              ) : (
                assignedRoutines.map((r) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.md, border: `1px solid ${Colors.teal}40` }}>
                    <div style={{ width: 44, height: 44, backgroundColor: Colors.teal + '20', borderRadius: Radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ClipboardList color={Colors.teal} size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white, textTransform: 'uppercase' }}>{r.name}</div>
                      <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>
                        {r.type} · {r.days.length} días · {r.exercises.length} ejercicios
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnassignRoutine(r.id)}
                      disabled={savingRoutine === r.id}
                      style={{ width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.bgElevated, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      {savingRoutine === r.id ? <Spinner color={Colors.gray} size={14} /> : <X color={Colors.gray} size={14} />}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Rutinas disponibles para asignar */}
          {unassignedRoutines.length > 0 && (
            <div>
              <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, letterSpacing: 0.5 }}>AGREGAR RUTINA</span>
              <div style={{ marginTop: Spacing.sm, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
                {unassignedRoutines.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleAssignRoutine(r.id)}
                    disabled={savingRoutine === r.id}
                    style={{ display: 'flex', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.md, border: `1px solid transparent`, cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ width: 44, height: 44, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {savingRoutine === r.id ? <Spinner color={Colors.teal} size={16} /> : <ClipboardList color={Colors.gray} size={20} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white, textTransform: 'uppercase' }}>{r.name}</div>
                      <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>
                        {r.type} · {r.days.length} días · {r.exercises.length} ejercicios
                      </div>
                    </div>
                    <Check color={Colors.teal} size={16} style={{ opacity: 0.4 }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {coachRoutines.length === 0 && (
            <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.lg, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
              <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>No tienes rutinas creadas aún.</span>
              <button onClick={() => navigate('/coach/create-routine')} style={{ height: 40, backgroundColor: Colors.orange, borderRadius: Radius.md, border: 'none', cursor: 'pointer', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.blackText }}>
                + CREAR RUTINA
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
