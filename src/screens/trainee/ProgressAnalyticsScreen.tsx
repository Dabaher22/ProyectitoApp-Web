import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, Dumbbell, Clock } from 'lucide-react';
import ScreenHeader from '../../components/ScreenHeader';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import {
  getMacrocyclesByTrainee, getMesocyclesByMacrocycle,
  getActiveMacrocycle, getMacrocycleProgress, getWeeksRemaining,
  Macrocycle, Mesocycle, PHASE_LABELS, PHASE_COLORS,
} from '../../services/periodization';
import { getSessionsByTrainee, WorkoutSession, formatDuration, sessionVolume, sessionToMs } from '../../services/sessions';
import { useAuthStore } from '../../store/authStore';

export default function ProgressAnalyticsScreen() {
  const navigate = useNavigate();
  const { uid } = useAuthStore();

  const [macro, setMacro] = useState<Macrocycle | null>(null);
  const [mesocycles, setMesocycles] = useState<Mesocycle[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const [macros, sess] = await Promise.all([
        getMacrocyclesByTrainee(uid),
        getSessionsByTrainee(uid),
      ]);
      const active = getActiveMacrocycle(macros);
      if (active) {
        const mesos = await getMesocyclesByMacrocycle(active.id);
        setMacro(active);
        setMesocycles(mesos);
      }
      setSessions(sess);
    } catch (err) {
      console.error('Error cargando analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div>
        <ScreenHeader title="ESTADÍSTICAS" onBack={() => navigate('/trainee/journey')} />
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <Spinner color={Colors.teal} size={32} />
        </div>
      </div>
    );
  }

  // Stats
  const last30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentSessions = sessions.filter((s) => sessionToMs(s.startedAt) > last30Days);

  const totalSessions = sessions.length;
  const recentCount = recentSessions.length;
  const totalDuration = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const totalVol = sessions.reduce((acc, s) => acc + sessionVolume(s), 0);
  const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

  // Last 4 weeks bar data
  const weekBuckets = [0, 0, 0, 0];
  sessions.forEach((s) => {
    const ms = sessionToMs(s.startedAt);
    const daysAgo = Math.floor((Date.now() - ms) / (24 * 60 * 60 * 1000));
    const weekIdx = Math.floor(daysAgo / 7);
    if (weekIdx < 4) weekBuckets[weekIdx]++;
  });
  const reversedBuckets = [...weekBuckets].reverse();
  const maxBucket = Math.max(...reversedBuckets, 1);

  const progress = macro ? getMacrocycleProgress(macro) : 0;
  const weeksLeft = macro ? getWeeksRemaining(macro) : 0;

  return (
    <div>
      <ScreenHeader title="ESTADÍSTICAS" onBack={() => navigate('/trainee/journey')} />

      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
        {/* Top metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: Spacing.sm }}>
          {[
            { label: 'SESIONES', value: totalSessions, color: Colors.orange, icon: <Dumbbell color={Colors.orange} size={16} /> },
            { label: 'ESTE MES', value: recentCount, color: Colors.teal, icon: <TrendingUp color={Colors.teal} size={16} /> },
            { label: 'TIEMPO TOTAL', value: formatDuration(totalDuration), color: Colors.white, icon: <Clock color={Colors.gray} size={16} /> },
            { label: 'PROM/SESIÓN', value: formatDuration(avgDuration), color: Colors.white, icon: <Clock color={Colors.gray} size={16} /> },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {icon}
                <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray, letterSpacing: 0.5 }}>{label}</span>
              </div>
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 24, color }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Sesiones últimas 4 semanas */}
        <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
            SESIONES POR SEMANA
          </span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: Spacing.sm, height: 80 }}>
            {reversedBuckets.map((count, idx) => {
              const height = maxBucket > 0 ? Math.max((count / maxBucket) * 72, count > 0 ? 8 : 2) : 2;
              const labels = ['S-3', 'S-2', 'S-1', 'ESTA'];
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.orange, fontWeight: 700 }}>
                    {count > 0 ? count : ''}
                  </span>
                  <div style={{
                    width: '100%', height, borderRadius: 4,
                    backgroundColor: idx === 3 ? Colors.orange : Colors.bgElevated,
                  }} />
                  <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray }}>{labels[idx]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Volumen total */}
        {totalVol > 0 && (
          <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
              VOLUMEN TOTAL LEVANTADO
            </span>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 32, color: Colors.orange }}>
              {totalVol.toLocaleString('es-ES')} <span style={{ fontSize: 16, color: Colors.gray }}>kg</span>
            </span>
          </div>
        )}

        {/* Plan progress */}
        {macro && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
              PROGRESO DEL PLAN
            </span>
            <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
              <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white, textTransform: 'uppercase' }}>
                {macro.name}
              </div>
              <div style={{ height: 8, backgroundColor: Colors.bgElevated, borderRadius: Radius.full, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, backgroundColor: Colors.orange, borderRadius: Radius.full }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>
                  {Math.round(progress * 100)}% completado
                </span>
                <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.orange }}>
                  {weeksLeft} sem. restantes
                </span>
              </div>

              {/* Phase breakdown */}
              {mesocycles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  {mesocycles.map((meso) => {
                    const color = PHASE_COLORS[meso.phase];
                    const pct = (meso.durationWeeks / macro.durationWeeks) * 100;
                    return (
                      <div key={meso.id} style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
                        <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, width: 100, flexShrink: 0 }}>
                          {PHASE_LABELS[meso.phase]}
                        </span>
                        <div style={{ flex: 1, height: 4, backgroundColor: Colors.bgElevated, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, minWidth: 30, textAlign: 'right' }}>
                          {meso.durationWeeks}s
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
