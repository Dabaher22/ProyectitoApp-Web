import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, PlayCircle, ChevronDown, ChevronUp, Timer, Repeat, Zap, Film, X } from 'lucide-react';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { getRoutinesByTrainee, getPreviousRoutinesByTrainee, Routine } from '../../services/routines';
import { getCircuitsByTrainee, Circuit } from '../../services/circuits';
import { useAuthStore } from '../../store/authStore';

const CIRCUIT_COLOR = '#B980FF';

function GifButton({ gifUrl, onView }: { gifUrl?: string; onView: () => void }) {
  if (!gifUrl) return null;
  return (
    <button onClick={onView} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>
      <Film color={Colors.orange} size={11} />
      <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.orange, letterSpacing: 0.3 }}>VER GIF</span>
    </button>
  );
}

const MUSCLE_COLORS: Record<string, string> = {
  PECHO: '#FF6B6B', ESPALDA: '#4ECDC4', PIERNAS: '#45B7D1',
  HOMBROS: '#96CEB4', BRAZOS: '#FFEAA7', CORE: '#DDA0DD', 'GLÚTEOS': '#F0A500',
};

function getRoutineDays(routine: Routine): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const e of routine.exercises) {
    const d = (e as any).day ?? routine.days[0] ?? 'Día 1';
    if (!seen.has(d)) { seen.add(d); result.push(d); }
  }
  return result.length > 0 ? result : routine.days;
}

export default function RoutineScreen() {
  const navigate = useNavigate();
  const uid = useAuthStore((s) => s.uid)!;
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [previousRoutines, setPreviousRoutines] = useState<Routine[]>([]);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [loading, setLoading] = useState(true);

  // Track expanded routines/circuits by id
  const [expandedRoutines, setExpandedRoutines] = useState<Set<string>>(new Set());
  const [expandedCircuits, setExpandedCircuits] = useState<Set<string>>(new Set());
  const [showPrevious, setShowPrevious] = useState(false);
  const [viewingGif, setViewingGif] = useState<{ name: string; gifUrl: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [active, prev, circs] = await Promise.all([
        getRoutinesByTrainee(uid),
        getPreviousRoutinesByTrainee(uid),
        getCircuitsByTrainee(uid),
      ]);
      setRoutines(active);
      setPreviousRoutines(prev);
      setCircuits(circs);
    } finally { setLoading(false); }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const toggleRoutine = (id: string) => {
    setExpandedRoutines((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCircuit = (id: string) => {
    setExpandedCircuits((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const startWorkout = (routine: Routine, dayName: string) => {
    navigate('/trainee/workout', {
      state: {
        routineId: routine.id,
        routineName: routine.name,
        allExercises: routine.exercises,
        days: getRoutineDays(routine),
        startDay: dayName,
      }
    });
  };

  return (
    <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
      <div>
        <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 22, color: Colors.white, letterSpacing: 1 }}>MI RUTINA</div>
        <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, marginTop: 2 }}>
          {routines.length} activa{routines.length !== 1 ? 's' : ''}
          {circuits.length > 0 && ` · ${circuits.length} circuito${circuits.length > 1 ? 's' : ''}`}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
          <Spinner color={Colors.teal} size={32} />
        </div>
      ) : (
        <>
          {/* ── Rutinas ── */}
          {routines.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 40, gap: Spacing.md, textAlign: 'center' }}>
              <Dumbbell color={Colors.gray} size={48} />
              <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.white }}>Sin rutinas</div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, lineHeight: 1.6 }}>
                Tu coach aún no te ha asignado ninguna rutina.
              </div>
            </div>
          ) : (
            routines.map((r) => {
              const days = getRoutineDays(r);
              const isExpanded = expandedRoutines.has(r.id);
              return (
                <div key={r.id} style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, overflow: 'hidden' }}>
                  {/* Accordion header */}
                  <button
                    onClick={() => toggleRoutine(r.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
                      <div style={{ width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Colors.teal + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Dumbbell color={Colors.teal} size={18} />
                      </div>
                      <div>
                        <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, textTransform: 'uppercase' }}>{r.name}</div>
                        <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>
                          {r.type ? `${r.type} · ` : ''}{days.length} día{days.length !== 1 ? 's' : ''} · {r.exercises.length} ejercicios
                        </div>
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronUp color={Colors.teal} size={20} />
                      : <ChevronDown color={Colors.gray} size={20} />
                    }
                  </button>

                  {/* Accordion content */}
                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${Colors.bgElevated}` }}>
                      {days.map((dayName) => {
                        const dayExercises = r.exercises.filter((e) => ((e as any).day ?? r.days[0]) === dayName);
                        return (
                          <div key={dayName}>
                            {/* Day header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${Spacing.sm}px ${Spacing.md}px`, backgroundColor: Colors.bgElevated }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
                                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.white, textTransform: 'uppercase' }}>{dayName}</span>
                                <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>{dayExercises.length} ejerc.</span>
                              </div>
                              <button onClick={() => startWorkout(r, dayName)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                                <PlayCircle color={Colors.teal} size={16} />
                                <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11, color: Colors.teal }}>INICIAR</span>
                              </button>
                            </div>

                            {/* Exercise rows */}
                            <div style={{ padding: `0 ${Spacing.md}px` }}>
                              {dayExercises.map((e, i) => {
                                const isCardio = (e as any).type === 'cardio';
                                const muscleKey = (e.muscle ?? '').toUpperCase();
                                const muscleColor = MUSCLE_COLORS[muscleKey] ?? Colors.gray;
                                return (
                                  <div key={e.id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
                                    borderBottom: i < dayExercises.length - 1 ? `1px solid ${Colors.bgElevated}` : 'none',
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
                                      {isCardio
                                        ? <Timer color={Colors.teal} size={14} style={{ flexShrink: 0 }} />
                                        : <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: muscleColor, flexShrink: 0, marginTop: 1 }} />
                                      }
                                      <div>
                                        <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white }}>{e.name}</div>
                                        {!isCardio && e.muscle && (
                                          <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: muscleColor, marginTop: 1 }}>{e.muscle.toUpperCase()}</div>
                                        )}
                                        <GifButton gifUrl={e.gifUrl} onView={() => setViewingGif({ name: e.name, gifUrl: e.gifUrl! })} />
                                      </div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                      {isCardio
                                        ? <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.teal }}>{(e as any).durationMinutes} min</span>
                                        : <>
                                            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.white }}>{e.sets}×{e.reps}</span>
                                            {(e as any).rest > 0 && (
                                              <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>desc. {(e as any).rest}s</div>
                                            )}
                                          </>
                                      }
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* ── Circuitos ── */}
          {circuits.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>MIS CIRCUITOS</span>
              {circuits.map((c) => {
                const isExpanded = expandedCircuits.has(c.id);
                const minutes = c.format === 'amrap' ? c.timeLimitMinutes : c.totalMinutes;
                const Icon = c.format === 'amrap' ? Repeat : Zap;
                return (
                  <div key={c.id} style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, overflow: 'hidden' }}>
                    {/* Accordion header */}
                    <button
                      onClick={() => toggleCircuit(c.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
                        <div style={{ width: 36, height: 36, borderRadius: Radius.md, backgroundColor: CIRCUIT_COLOR + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon color={CIRCUIT_COLOR} size={18} />
                        </div>
                        <div>
                          <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, textTransform: 'uppercase' }}>{c.name}</div>
                          <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>
                            {c.format.toUpperCase()} · {minutes} min · {c.exercises.length} ejercicios
                          </div>
                        </div>
                      </div>
                      {isExpanded
                        ? <ChevronUp color={CIRCUIT_COLOR} size={20} />
                        : <ChevronDown color={Colors.gray} size={20} />
                      }
                    </button>

                    {/* Accordion content */}
                    {isExpanded && (
                      <div style={{ borderTop: `1px solid ${Colors.bgElevated}` }}>
                        {/* Exercise list */}
                        <div style={{ padding: `0 ${Spacing.md}px` }}>
                          {c.exercises.map((e, i) => (
                            <div key={e.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
                              borderBottom: i < c.exercises.length - 1 ? `1px solid ${Colors.bgElevated}` : 'none',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, minWidth: 0 }}>
                                {e.type === 'cardio' && <Timer color={Colors.teal} size={13} style={{ flexShrink: 0 }} />}
                                <div>
                                  <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white }}>{e.name}</span>
                                  <GifButton gifUrl={e.gifUrl} onView={() => setViewingGif({ name: e.name, gifUrl: e.gifUrl! })} />
                                </div>
                              </div>
                              <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: e.type === 'cardio' ? Colors.teal : CIRCUIT_COLOR, flexShrink: 0 }}>
                                {e.type === 'cardio' ? `${e.durationMinutes} min` : `×${e.reps}`}
                              </span>
                            </div>
                          ))}
                        </div>
                        {/* Start button */}
                        <div style={{ padding: Spacing.md }}>
                          <button
                            onClick={() => navigate('/trainee/circuit', { state: c })}
                            style={{ width: '100%', height: 46, backgroundColor: CIRCUIT_COLOR, borderRadius: Radius.md, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white, letterSpacing: 0.5 }}
                          >
                            INICIAR {c.format.toUpperCase()} →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Rutinas anteriores */}
          {previousRoutines.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
              <button
                onClick={() => setShowPrevious((v) => !v)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, letterSpacing: 0.5 }}>
                  RUTINAS ANTERIORES ({previousRoutines.length})
                </span>
                {showPrevious ? <ChevronUp color={Colors.gray} size={16} /> : <ChevronDown color={Colors.gray} size={16} />}
              </button>

              {showPrevious && previousRoutines.map((r) => {
                const days = getRoutineDays(r);
                return (
                  <div key={r.id} style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6, borderLeft: `3px solid ${Colors.bgElevated}` }}>
                    <div>
                      <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white, textTransform: 'uppercase' }}>{r.name}</div>
                      <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>
                        {r.type} · {r.exercises.length} ejercicios · {days.length} días
                      </div>
                    </div>
                    <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, border: `1px solid ${Colors.bgElevated}`, borderRadius: Radius.full, padding: '3px 10px' }}>
                      ANTERIOR
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {viewingGif && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 500, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${Spacing.md}px ${Spacing.lg}px`, paddingTop: 'calc(16px + env(safe-area-inset-top))' }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white, textTransform: 'uppercase' }}>{viewingGif.name}</span>
            <button onClick={() => setViewingGif(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
              <X color={Colors.white} size={22} />
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg }}>
            {viewingGif.gifUrl.endsWith('.mp4') ? (
              <video src={viewingGif.gifUrl} autoPlay loop muted playsInline style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: Radius.lg }} />
            ) : (
              <img src={viewingGif.gifUrl} alt={viewingGif.name} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: Radius.lg, objectFit: 'contain' }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
