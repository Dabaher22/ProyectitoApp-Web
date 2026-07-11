import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Calendar, Dumbbell, Flame, ClipboardList, ChevronRight, FileDown, X } from 'lucide-react';
import Badge from '../../components/Badge';
import ScreenHeader from '../../components/ScreenHeader';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { getSessionsByTrainee, WorkoutSession, formatSessionDate, formatDuration } from '../../services/sessions';
import { buildTraineeReport } from '../../services/reportData';
import { exportTraineeReportPdf } from '../../services/pdfExport';

export default function CoachProgressViewScreen() {
  const navigate = useNavigate();
  const { traineeId } = useParams<{ traineeId: string }>();
  const location = useLocation();
  const traineeName = (location.state as any)?.traineeName ?? 'Asesorado';
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportPicker, setShowExportPicker] = useState(false);

  useEffect(() => {
    if (traineeId) getSessionsByTrainee(traineeId).then(setSessions).finally(() => setLoading(false));
  }, [traineeId]);

  const totalExercises = sessions.reduce((acc, s) => acc + s.exercises.length, 0);
  const totalDuration = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);

  const stats = [
    { label: 'SESIONES', value: String(sessions.length), icon: <Calendar color={Colors.orange} size={18} /> },
    { label: 'EJERCICIOS', value: String(totalExercises), icon: <Dumbbell color={Colors.teal} size={18} /> },
    { label: 'TIEMPO', value: formatDuration(totalDuration), icon: <Flame color={Colors.orange} size={18} /> },
  ];

  const distinctRoutines = Array.from(new Map(sessions.map((s) => [s.routineId, s.routineName])).entries());

  const handleExport = (routineId?: string) => {
    const filtered = routineId ? sessions.filter((s) => s.routineId === routineId) : sessions;
    const scopeLabel = routineId
      ? (distinctRoutines.find(([id]) => id === routineId)?.[1] ?? 'Rutina')
      : 'Resumen completo';
    exportTraineeReportPdf(buildTraineeReport(filtered), traineeName, scopeLabel);
    setShowExportPicker(false);
  };

  const handleExportClick = () => {
    if (sessions.length === 0) return;
    if (distinctRoutines.length > 1) {
      setShowExportPicker(true);
    } else {
      handleExport();
    }
  };

  return (
    <div>
      <ScreenHeader title="PROGRESO" onBack={() => navigate(-1)} />
      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
        {/* Profile */}
        <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, display: 'flex', alignItems: 'center', gap: Spacing.md }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 24, color: Colors.blackText }}>{traineeName.charAt(0).toUpperCase()}</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.white, textTransform: 'uppercase' }}>{traineeName}</span>
            <Badge label="ACTIVO" variant="active" />
          </div>
          <button onClick={() => navigate(`/coach/assign-routine/${traineeId}`, { state: { traineeName } })} style={{
            display: 'flex', alignItems: 'center', gap: 4, backgroundColor: Colors.bgElevated,
            borderRadius: Radius.md, paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: 'none', cursor: 'pointer',
          }}>
            <ClipboardList color={Colors.orange} size={18} />
            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11, color: Colors.orange }}>Asignar</span>
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: Spacing.sm }}>
          {stats.map((s) => (
            <div key={s.label} style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              {s.icon}
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 22, color: Colors.white }}>{s.value}</span>
              <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray, letterSpacing: 0.5 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Export PDF */}
        <button
          onClick={handleExportClick}
          disabled={sessions.length === 0}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
            height: 46, backgroundColor: Colors.bgCard, borderRadius: Radius.md,
            border: `1px solid ${Colors.bgElevated}`, cursor: sessions.length === 0 ? 'default' : 'pointer',
            opacity: sessions.length === 0 ? 0.5 : 1,
          }}
        >
          <FileDown color={Colors.white} size={16} />
          <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.white, letterSpacing: 0.5 }}>EXPORTAR PDF</span>
        </button>

        {/* History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>HISTORIAL DE SESIONES</span>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 20 }}><Spinner color={Colors.orange} size={28} /></div>
          ) : sessions.length === 0 ? (
            <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.lg, textAlign: 'center' }}>
              <span style={{ fontFamily: Fonts.mono, fontSize: 13, color: Colors.gray }}>Sin sesiones registradas aún</span>
            </div>
          ) : (
            sessions.map((s) => (
              <div key={s.id} onClick={() => navigate('/coach/session-detail', { state: { session: s, traineeName } })}
                style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>{formatSessionDate(s.startedAt)}</span>
                  <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white, textTransform: 'uppercase' }}>{s.routineName}</span>
                  <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.orange }}>{s.dayName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.orange }}>{formatDuration(s.durationSeconds)}</span>
                    <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>{s.exercises.length} ejerc.</span>
                  </div>
                  <ChevronRight color={Colors.gray} size={16} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showExportPicker && (
        <div
          onClick={() => setShowExportPicker(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', backgroundColor: Colors.bgCard, borderRadius: '20px 20px 0 0',
              padding: `${Spacing.lg}px ${Spacing.lg}px calc(${Spacing.lg}px + env(safe-area-inset-bottom))`,
              display: 'flex', flexDirection: 'column', gap: Spacing.sm,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs }}>
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, letterSpacing: 0.5 }}>EXPORTAR PDF</span>
              <button onClick={() => setShowExportPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <X color={Colors.gray} size={20} />
              </button>
            </div>
            <button
              onClick={() => handleExport()}
              style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, padding: Spacing.md, border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <FileDown color={Colors.orange} size={18} />
              <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.white }}>RESUMEN COMPLETO</span>
            </button>
            {distinctRoutines.map(([routineId, routineName]) => (
              <button
                key={routineId}
                onClick={() => handleExport(routineId)}
                style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, padding: Spacing.md, border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <FileDown color={Colors.teal} size={18} />
                <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.white, textTransform: 'uppercase' }}>{routineName}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
