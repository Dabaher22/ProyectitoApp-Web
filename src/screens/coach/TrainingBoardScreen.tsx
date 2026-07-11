import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Bell, ClipboardList, FileDown, History, ArrowRight, CalendarRange, Flame, Check,
} from 'lucide-react';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { getConnectionByTrainee, getMembershipDays } from '../../services/connections';
import { getRoutinesByTrainee, Routine } from '../../services/routines';
import { getSessionsByTrainee, formatSessionDate, formatDuration, WorkoutSession } from '../../services/sessions';
import { buildTraineeReport } from '../../services/reportData';
import { exportTraineeReportPdf } from '../../services/pdfExport';
import {
  getMacrocyclesByTrainee, getMesocyclesByMacrocycle, getActiveMacrocycle, getCurrentMesocycle,
  PHASE_LABELS, PHASE_COLORS, Macrocycle, Mesocycle,
} from '../../services/periodization';
import { useAuthStore } from '../../store/authStore';

const LIGHT_CARD_BG = '#F0F0EC';
const LIGHT_TEXT = '#1A1A1A';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function TrainingBoardScreen() {
  const navigate = useNavigate();
  const { traineeId } = useParams<{ traineeId: string }>();
  const location = useLocation();
  const stateTraineeName = (location.state as any)?.traineeName as string | undefined;
  const uid = useAuthStore((s) => s.uid)!;

  const [loading, setLoading] = useState(true);
  const [traineeName, setTraineeName] = useState(stateTraineeName ?? 'Asesorado');
  const [membershipDays, setMembershipDays] = useState<number | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [activeMacrocycle, setActiveMacrocycle] = useState<Macrocycle | null>(null);
  const [mesocycles, setMesocycles] = useState<Mesocycle[]>([]);
  const [currentMesoId, setCurrentMesoId] = useState<string | null>(null);

  useEffect(() => {
    if (!traineeId || !uid) return;
    let cancelled = false;

    const load = async () => {
      const [connection, myRoutines, mySessions, macrocycles] = await Promise.all([
        getConnectionByTrainee(traineeId),
        getRoutinesByTrainee(traineeId),
        getSessionsByTrainee(traineeId),
        getMacrocyclesByTrainee(traineeId),
      ]);
      if (cancelled) return;

      if (connection) {
        setTraineeName(stateTraineeName ?? connection.traineeName);
        setMembershipDays(getMembershipDays(connection.createdAt));
      }
      setRoutines(myRoutines);
      setSessions(mySessions);

      const active = getActiveMacrocycle(macrocycles);
      setActiveMacrocycle(active);
      if (active) {
        const mesos = await getMesocyclesByMacrocycle(active.id);
        if (!cancelled) {
          setMesocycles(mesos);
          setCurrentMesoId(getCurrentMesocycle(mesos, active)?.id ?? null);
        }
      }

      setLoading(false);
    };

    load().catch((e) => { console.error('Error cargando tablero:', e); if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [traineeId, uid, stateTraineeName]);

  const handleExportPdf = () => {
    if (sessions.length === 0) return;
    const distinctRoutines = Array.from(new Map(sessions.map((s) => [s.routineId, s.routineName])).entries());
    if (distinctRoutines.length > 1) {
      navigate(`/coach/progress/${traineeId}`, { state: { traineeName } });
      return;
    }
    exportTraineeReportPdf(buildTraineeReport(sessions), traineeName, 'Resumen completo');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgPage }}>
        <Spinner color={Colors.orange} size={32} />
      </div>
    );
  }

  const lastSession = sessions[0] ?? null;

  const totalExInLast = lastSession?.exercises.length ?? 0;
  const doneExInLast = lastSession?.exercises.filter((ex) => ex.sets.some((s) => s.done)).length ?? 0;
  const totalSetsAllTime = sessions.reduce((acc, s) => acc + s.exercises.reduce((a, ex) => a + ex.sets.filter((x) => x.done).length, 0), 0);

  let avgRestLabel = '—';
  if (lastSession) {
    const r = routines.find((x) => x.id === lastSession.routineId);
    if (r) {
      const dayExercises = r.exercises.filter((e: any) => (e.day ?? r.days[0]) === lastSession.dayName && e.rest);
      if (dayExercises.length > 0) {
        const avg = dayExercises.reduce((a, e) => a + (e.rest || 0), 0) / dayExercises.length;
        avgRestLabel = `${Math.round(avg)} seg avg`;
      }
    }
  }

  let weekCursor = 0;
  const mesoRanges = mesocycles.map((m) => {
    const startWeek = weekCursor + 1;
    weekCursor += m.durationWeeks;
    return { meso: m, range: `S${startWeek}-S${weekCursor}`, startWeek: startWeek - 1, endWeek: weekCursor };
  });

  const getMesoProgress = (startWeek: number, endWeek: number): number => {
    if (!activeMacrocycle?.startDate) return 0;
    const startMs = new Date(activeMacrocycle.startDate).getTime() + startWeek * WEEK_MS;
    const endMs = new Date(activeMacrocycle.startDate).getTime() + endWeek * WEEK_MS;
    const now = Date.now();
    if (now <= startMs) return 0;
    if (now >= endMs) return 1;
    return (now - startMs) / (endMs - startMs);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bgPage, paddingBottom: Spacing.xl }}>
      {/* Cabecera */}
      <div style={{ padding: `${Spacing.lg}px ${Spacing.lg}px ${Spacing.md}px`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, letterSpacing: 0.5 }}>Asesorado</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, marginTop: 2 }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 24, color: Colors.white, textTransform: 'uppercase' }}>{traineeName}</span>
            {membershipDays !== null && (
              <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11, color: Colors.teal }}>{membershipDays} días</span>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate('/coach/create-notification', { state: { traineeId, traineeName } })}
          style={{ width: 40, height: 40, borderRadius: Radius.full, backgroundColor: Colors.bgElevated, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <Bell color={Colors.white} size={18} />
        </button>
      </div>

      <div style={{ padding: `0 ${Spacing.lg}px`, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
        {/* Rutina asignada + Exportar PDF, lado a lado */}
        <div style={{ display: 'flex', gap: Spacing.sm, alignItems: 'stretch' }}>
          {/* Tarjeta: Rutina asignada */}
          <div style={{ flex: 1, minWidth: 0, backgroundColor: Colors.orange, borderRadius: Radius.xl, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.blackText, letterSpacing: 0.3 }}>Rutina Asignada</span>
              <ClipboardList color={Colors.blackText} size={16} />
            </div>

            {routines.length === 0 ? (
              <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.blackText, opacity: 0.7 }}>
                Sin rutinas asignadas todavía.
              </span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {routines.map((r) => (
                  <div key={r.id} style={{ backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: Radius.md, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 12, color: Colors.blackText, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                      <div style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.blackText, opacity: 0.75 }}>{r.type} · {r.days.length} días · {r.exercises.length} ejercicios</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {r.days.map((d) => (
                        <span key={d} style={{ backgroundColor: 'rgba(0,0,0,0.15)', border: `1px solid ${Colors.blackText}30`, borderRadius: Radius.sm, padding: '2px 6px', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 8, color: Colors.blackText }}>{d}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => navigate(`/coach/assign-routine/${traineeId}`, { state: { traineeName } })}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38,
                backgroundColor: Colors.blackText, borderRadius: Radius.full, border: 'none', cursor: 'pointer', marginTop: 'auto', padding: '0 14px',
              }}
            >
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 11, color: Colors.white, letterSpacing: 0.5 }}>GESTIONAR</span>
              <ArrowRight color={Colors.orange} size={13} />
            </button>
          </div>

          {/* Tarjeta: Exportar PDF */}
          <div style={{ flex: 1, minWidth: 0, backgroundColor: Colors.teal, borderRadius: Radius.xl, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.blackText, opacity: 0.7, letterSpacing: 0.3 }}>Última actualización</span>
              <FileDown color={Colors.blackText} size={14} />
            </div>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.blackText, lineHeight: 1.2 }}>
              Genera tu Reporte PDF de Progreso
            </span>
            <button
              onClick={handleExportPdf}
              disabled={sessions.length === 0}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38,
                backgroundColor: Colors.blackText, borderRadius: Radius.full, border: 'none',
                cursor: sessions.length === 0 ? 'default' : 'pointer', opacity: sessions.length === 0 ? 0.5 : 1,
                marginTop: 'auto', padding: '0 14px',
              }}
            >
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 11, color: Colors.white, letterSpacing: 0.5 }}>DESCARGAR</span>
              <FileDown color={Colors.teal} size={13} />
            </button>
          </div>
        </div>

        {/* Tarjeta: Último entrenamiento (fondo claro) */}
        <div style={{ backgroundColor: LIGHT_CARD_BG, borderRadius: Radius.xl, padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
            <History color={LIGHT_TEXT} size={16} />
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: LIGHT_TEXT }}>Último Entrenamiento</span>
          </div>

          {lastSession ? (
            <>
              <div style={{ backgroundColor: LIGHT_TEXT, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.orange + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Flame color={Colors.orange} size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white, textTransform: 'uppercase' }}>{lastSession.routineName}</div>
                  <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>{formatSessionDate(lastSession.startedAt)} · {formatDuration(lastSession.durationSeconds)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: Spacing.sm }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: LIGHT_TEXT }}>{doneExInLast} de {totalExInLast}</div>
                  <div style={{ fontFamily: Fonts.mono, fontSize: 9, color: '#666', letterSpacing: 0.3 }}>Ejercicios</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: LIGHT_TEXT }}>{totalSetsAllTime} total</div>
                  <div style={{ fontFamily: Fonts.mono, fontSize: 9, color: '#666', letterSpacing: 0.3 }}>Series</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: LIGHT_TEXT }}>{avgRestLabel}</div>
                  <div style={{ fontFamily: Fonts.mono, fontSize: 9, color: '#666', letterSpacing: 0.3 }}>Descanso</div>
                </div>
              </div>
            </>
          ) : (
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: '#666' }}>Sin entrenamientos registrados todavía.</span>
          )}

          <button
            onClick={() => navigate(`/coach/progress/${traineeId}`, { state: { traineeName } })}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44,
              backgroundColor: LIGHT_TEXT, borderRadius: Radius.full, border: 'none', cursor: 'pointer', alignSelf: 'flex-start', padding: '0 20px',
            }}
          >
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.white, letterSpacing: 0.5 }}>VER HISTORIAL</span>
            <ArrowRight color={Colors.white} size={15} />
          </button>
        </div>

        {/* Sección Plan */}
        <div style={{ marginTop: Spacing.sm, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white, letterSpacing: 1 }}>PLAN</span>
            <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>
              {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>

          {!activeMacrocycle ? (
            <button
              onClick={() => navigate('/coach/periodization/create', { state: { traineeId, traineeName } })}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
                height: 52, backgroundColor: Colors.orange, borderRadius: Radius.xl, border: 'none', cursor: 'pointer',
              }}
            >
              <CalendarRange color={Colors.blackText} size={18} />
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.blackText, letterSpacing: 0.5 }}>CREAR PLAN</span>
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {mesoRanges.map(({ meso, range, startWeek, endWeek }, idx) => {
                const color = PHASE_COLORS[meso.phase];
                const isCurrent = meso.id === currentMesoId;
                const currentIdx = mesocycles.findIndex((m) => m.id === currentMesoId);
                const isPast = currentIdx > idx;
                const isLast = idx === mesoRanges.length - 1;
                const progress = isCurrent ? getMesoProgress(startWeek, endWeek) : 0;
                return (
                  <div key={meso.id} style={{ display: 'flex', gap: Spacing.md }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 12,
                        backgroundColor: isPast ? color : Colors.bgPage,
                        border: `2px solid ${isPast || isCurrent ? color : Colors.bgElevated}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {isPast && <Check color={Colors.blackText} size={13} />}
                        {isCurrent && !isPast && <Flame color={color} size={12} />}
                      </div>
                      {!isLast && <div style={{ width: 2, flex: 1, minHeight: 28, backgroundColor: isPast ? color + '60' : Colors.bgElevated, marginTop: 2 }} />}
                    </div>
                    <div style={{ paddingBottom: isLast ? 0 : Spacing.md, flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: isPast || isCurrent ? color : Colors.gray, letterSpacing: 0.5 }}>
                          {PHASE_LABELS[meso.phase].toUpperCase()}
                        </span>
                        <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>{range}</span>
                      </div>
                      {meso.notes && (
                        <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, marginTop: 2 }}>{meso.notes}</div>
                      )}
                      {isCurrent && (
                        <div style={{ height: 4, borderRadius: 2, backgroundColor: Colors.bgElevated, marginTop: 6, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, backgroundColor: color, borderRadius: 2 }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
