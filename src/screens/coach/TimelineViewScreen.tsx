import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ScreenHeader from '../../components/ScreenHeader';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import {
  getMacrocycleById, getMesocyclesByMacrocycle,
  Macrocycle, Mesocycle, PHASE_LABELS, PHASE_COLORS,
  getMacrocycleProgress, getWeeksRemaining,
} from '../../services/periodization';

export default function TimelineViewScreen() {
  const navigate = useNavigate();
  const { macrocycleId } = useParams<{ macrocycleId: string }>();
  const [macro, setMacro] = useState<Macrocycle | null>(null);
  const [mesocycles, setMesocycles] = useState<Mesocycle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!macrocycleId) return;
    try {
      const [m, mesos] = await Promise.all([
        getMacrocycleById(macrocycleId),
        getMesocyclesByMacrocycle(macrocycleId),
      ]);
      setMacro(m);
      setMesocycles(mesos);
    } catch (err) {
      console.error('Error cargando timeline:', err);
    } finally {
      setLoading(false);
    }
  }, [macrocycleId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spinner color={Colors.orange} size={32} />
      </div>
    );
  }

  if (!macro) {
    return (
      <div>
        <ScreenHeader title="TIMELINE" onBack={() => navigate(`/coach/periodization/${macrocycleId}`)} />
        <div style={{ padding: Spacing.lg, textAlign: 'center' }}>
          <span style={{ fontFamily: Fonts.mono, fontSize: 13, color: Colors.gray }}>No encontrado.</span>
        </div>
      </div>
    );
  }

  const progress = getMacrocycleProgress(macro);
  const weeksLeft = getWeeksRemaining(macro);
  const totalWeeks = macro.durationWeeks;
  const progressWeek = Math.round(progress * totalWeeks);

  const legendItems = mesocycles
    .map((m) => ({ phase: m.phase, label: PHASE_LABELS[m.phase], color: PHASE_COLORS[m.phase] }))
    .filter((item, idx, arr) => arr.findIndex((x) => x.phase === item.phase) === idx);

  return (
    <div>
      <ScreenHeader
        title="TIMELINE"
        onBack={() => navigate(`/coach/periodization/${macrocycleId}`)}
      />

      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
        {/* Macro info */}
        <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.white, textTransform: 'uppercase' }}>
            {macro.name}
          </div>
          <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>
            {macro.traineeName} · {totalWeeks} semanas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ height: 6, backgroundColor: Colors.bgElevated, borderRadius: Radius.full, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, backgroundColor: Colors.orange, borderRadius: Radius.full }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>
                Semana {progressWeek} de {totalWeeks}
              </span>
              <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.orange }}>
                {weeksLeft} restantes
              </span>
            </div>
          </div>
        </div>

        {/* Legend */}
        {legendItems.length > 0 && (
          <div style={{ display: 'flex', gap: Spacing.sm, flexWrap: 'wrap' }}>
            {legendItems.map(({ phase, label, color }) => (
              <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
                <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Timeline grid */}
        {mesocycles.length === 0 ? (
          <div style={{
            backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
            padding: Spacing.xl, textAlign: 'center',
          }}>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>
              Sin mesociclos planificados — agrega mesociclos desde el detalle.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
              ESTRUCTURA SEMANAL
            </span>
            {mesocycles.map((meso, mesoIdx) => {
              const color = PHASE_COLORS[meso.phase];
              let weekOffset = mesocycles.slice(0, mesoIdx).reduce((acc, m) => acc + m.durationWeeks, 0);
              return (
                <div key={meso.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
                    <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11, color }}>
                      {meso.name.toUpperCase()} — {PHASE_LABELS[meso.phase]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {meso.microcycles.map((micro) => {
                      const absWeek = weekOffset + micro.weekNumber;
                      const isCurrent = absWeek === progressWeek;
                      const isPast = absWeek < progressWeek;
                      return (
                        <div
                          key={micro.weekNumber}
                          style={{
                            minWidth: 48, height: 52,
                            backgroundColor: isCurrent ? color : isPast ? color + '30' : Colors.bgCard,
                            border: `1px solid ${isCurrent ? color : isPast ? color + '50' : Colors.bgElevated}`,
                            borderRadius: Radius.sm,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: 2, padding: '0 6px',
                          }}
                        >
                          <span style={{
                            fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13,
                            color: isCurrent ? Colors.blackText : isPast ? color : Colors.white,
                          }}>
                            {absWeek}
                          </span>
                          {isCurrent && (
                            <span style={{ fontFamily: Fonts.mono, fontSize: 7, fontWeight: 700, color: Colors.blackText }}>
                              HOY
                            </span>
                          )}
                          {micro.routineId && !isCurrent && (
                            <div style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isPast ? color : color + '70' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {meso.notes ? (
                    <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, paddingLeft: 16 }}>
                      {meso.notes}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {/* Mesocycle list detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
            DETALLE POR BLOQUE
          </span>
          {mesocycles.map((meso) => {
            const color = PHASE_COLORS[meso.phase];
            const withRoutine = meso.microcycles.filter((m) => m.routineId).length;
            return (
              <div
                key={meso.id}
                style={{
                  backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
                  padding: Spacing.md, borderLeft: `3px solid ${color}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white, textTransform: 'uppercase' }}>
                    {meso.name}
                  </div>
                  <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: color, marginTop: 2 }}>
                    {PHASE_LABELS[meso.phase]} · {meso.durationWeeks} semanas
                  </div>
                  <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, marginTop: 2 }}>
                    {withRoutine}/{meso.durationWeeks} semanas con rutina
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/coach/periodization/${macrocycleId}/${meso.id}/create-micro`)}
                  style={{
                    height: 32, paddingLeft: 12, paddingRight: 12,
                    backgroundColor: Colors.bgElevated, borderRadius: Radius.md,
                    border: 'none', cursor: 'pointer',
                    fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11, color: Colors.white,
                  }}
                >
                  EDITAR
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
