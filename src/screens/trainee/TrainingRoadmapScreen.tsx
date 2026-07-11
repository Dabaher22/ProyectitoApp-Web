import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ScreenHeader from '../../components/ScreenHeader';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import {
  getMacrocyclesByTrainee, getMesocyclesByMacrocycle,
  getActiveMacrocycle, getCurrentMesocycle,
  Macrocycle, Mesocycle,
  PHASE_LABELS, PHASE_COLORS, getMacrocycleProgress,
} from '../../services/periodization';
import { useAuthStore } from '../../store/authStore';

export default function TrainingRoadmapScreen() {
  const navigate = useNavigate();
  const { uid } = useAuthStore();

  const [macro, setMacro] = useState<Macrocycle | null>(null);
  const [mesocycles, setMesocycles] = useState<Mesocycle[]>([]);
  const [currentMesoId, setCurrentMesoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const macros = await getMacrocyclesByTrainee(uid);
      const active = getActiveMacrocycle(macros);
      if (!active) { setLoading(false); return; }
      const mesos = await getMesocyclesByMacrocycle(active.id);
      const currentMeso = getCurrentMesocycle(mesos, active);
      setMacro(active);
      setMesocycles(mesos);
      setCurrentMesoId(currentMeso?.id ?? null);
    } catch (err) {
      console.error('Error cargando roadmap:', err);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div>
        <ScreenHeader title="ROADMAP" onBack={() => navigate('/trainee/journey')} />
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <Spinner color={Colors.teal} size={32} />
        </div>
      </div>
    );
  }

  if (!macro) {
    return (
      <div>
        <ScreenHeader title="ROADMAP" onBack={() => navigate('/trainee/journey')} />
        <div style={{ padding: Spacing.lg, textAlign: 'center' }}>
          <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>Sin plan activo.</span>
        </div>
      </div>
    );
  }

  const progress = getMacrocycleProgress(macro);
  const totalWeeks = mesocycles.reduce((acc, m) => acc + m.durationWeeks, 0);

  return (
    <div>
      <ScreenHeader title="ROADMAP" onBack={() => navigate('/trainee/journey')} />

      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
        {/* Header del plan */}
        <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.white, textTransform: 'uppercase' }}>
            {macro.name}
          </div>
          {macro.goal && (
            <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>{macro.goal}</div>
          )}
          <div style={{ height: 6, backgroundColor: Colors.bgElevated, borderRadius: Radius.full, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, backgroundColor: Colors.orange, borderRadius: Radius.full }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>
              {Math.round(progress * 100)}% completado
            </span>
            <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>
              {macro.durationWeeks} semanas en total
            </span>
          </div>
        </div>

        {/* Roadmap visual */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2, marginBottom: Spacing.sm }}>
            TU CAMINO
          </span>
          {mesocycles.map((meso, idx) => {
            const color = PHASE_COLORS[meso.phase];
            const isCurrent = meso.id === currentMesoId;
            const isPast = mesocycles.indexOf(mesocycles.find((m) => m.id === currentMesoId)!) > idx;
            const isLast = idx === mesocycles.length - 1;
            return (
              <div key={meso.id} style={{ display: 'flex', gap: Spacing.md }}>
                {/* Timeline indicator */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: isCurrent ? color : isPast ? color + '50' : Colors.bgElevated,
                    border: `2px solid ${isCurrent ? color : isPast ? color + '80' : Colors.bgElevated}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {isPast && <span style={{ fontSize: 12 }}>✓</span>}
                    {isCurrent && <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.blackText }} />}
                  </div>
                  {!isLast && (
                    <div style={{
                      width: 2, flex: 1, minHeight: 24,
                      backgroundColor: isPast ? color + '50' : Colors.bgElevated,
                      marginTop: 2, marginBottom: 2,
                    }} />
                  )}
                </div>

                {/* Content */}
                <button
                  onClick={() => navigate(`/trainee/journey/phase/${meso.id}`)}
                  style={{
                    flex: 1, marginBottom: isLast ? 0 : Spacing.sm,
                    backgroundColor: isCurrent ? color + '15' : Colors.bgCard,
                    border: `1px solid ${isCurrent ? color : Colors.bgElevated}`,
                    borderRadius: Radius.lg, padding: Spacing.md,
                    display: 'flex', flexDirection: 'column', gap: Spacing.xs,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white, textTransform: 'uppercase' }}>
                      {meso.name}
                    </div>
                    {isCurrent && (
                      <span style={{
                        backgroundColor: color, borderRadius: Radius.full,
                        padding: '2px 8px', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 9, color: Colors.blackText,
                      }}>
                        ACTUAL
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: color }}>
                    {PHASE_LABELS[meso.phase].toUpperCase()} · {meso.durationWeeks} SEMANAS
                  </div>
                  {meso.notes && (
                    <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, lineHeight: 1.5 }}>
                      {meso.notes}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                    {meso.microcycles.map((micro) => (
                      <div
                        key={micro.weekNumber}
                        style={{
                          width: 20, height: 6, borderRadius: 3,
                          backgroundColor: micro.routineId
                            ? (isCurrent ? color : color + '50')
                            : Colors.bgElevated,
                        }}
                      />
                    ))}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
