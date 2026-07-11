import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarRange, Plus, Users, Settings } from 'lucide-react';
import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { getMacrocyclesByCoach, getMesocyclesByMacrocycle, Macrocycle, PHASE_LABELS, PHASE_COLORS, getMacrocycleProgress, getWeeksRemaining } from '../../services/periodization';
import { getConnectionsByCoach, Connection } from '../../services/connections';
import { useAuthStore } from '../../store/authStore';

export default function PeriodizationDashboardScreen() {
  const navigate = useNavigate();
  const { uid } = useAuthStore();
  const [macrocycles, setMacrocycles] = useState<Macrocycle[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [mesoCountMap, setMesoCountMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const [macros, conns] = await Promise.all([
        getMacrocyclesByCoach(uid),
        getConnectionsByCoach(uid),
      ]);
      setMacrocycles(macros);
      setConnections(conns);
      const counts = await Promise.all(
        macros.map((m) => getMesocyclesByMacrocycle(m.id).then((mesos) => ({ id: m.id, count: mesos.length })))
      );
      const map: Record<string, number> = {};
      for (const { id, count } of counts) map[id] = count;
      setMesoCountMap(map);
    } catch (err) {
      console.error('Error cargando periodización:', err);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const statusLabel: Record<string, string> = {
    draft: 'BORRADOR',
    active: 'ACTIVO',
    completed: 'COMPLETADO',
  };

  const statusVariant = (status: string): 'active' | 'default' =>
    status === 'active' ? 'active' : 'default';

  return (
    <div>
      <ScreenHeader
        title="PERIODIZACIÓN"
        right={
          <button
            onClick={() => navigate('/coach/periodization/create')}
            style={{
              backgroundColor: Colors.orange, borderRadius: Radius.md,
              height: 36, paddingLeft: 14, paddingRight: 14,
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: Spacing.xs,
            }}
          >
            <Plus size={16} color={Colors.blackText} />
            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.blackText }}>NUEVO</span>
          </button>
        }
      />

      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <Spinner color={Colors.orange} size={32} />
          </div>
        ) : macrocycles.length === 0 ? (
          <div style={{
            backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
            padding: Spacing.xl, textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Spacing.md,
          }}>
            <CalendarRange color={Colors.gray} size={40} />
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.white }}>
              Sin macrociclos
            </span>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, lineHeight: 1.6 }}>
              Crea el primer plan de periodización para un asesorado.
            </span>
            <button
              onClick={() => navigate('/coach/periodization/create')}
              style={{
                backgroundColor: Colors.orange, borderRadius: Radius.md,
                height: 44, paddingLeft: 20, paddingRight: 20,
                border: 'none', cursor: 'pointer',
                fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.blackText,
              }}
            >
              + CREAR MACROCICLO
            </button>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: Spacing.sm }}>
              <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md }}>
                <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>MACROCICLOS</div>
                <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 28, color: Colors.orange, marginTop: 4 }}>
                  {macrocycles.length}
                </div>
              </div>
              <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md }}>
                <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>ACTIVOS</div>
                <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 28, color: Colors.teal, marginTop: 4 }}>
                  {macrocycles.filter((m) => m.status === 'active').length}
                </div>
              </div>
            </div>

            {/* Lista de macrociclos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
                MIS MACROCICLOS
              </span>
              {macrocycles.map((macro) => {
                const progress = getMacrocycleProgress(macro);
                const weeksLeft = getWeeksRemaining(macro);
                const mesoCount = mesoCountMap[macro.id] ?? 0;

                return (
                  <button
                    key={macro.id}
                    onClick={() => navigate(`/coach/periodization/${macro.id}`)}
                    style={{
                      backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
                      padding: Spacing.md, border: 'none', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', gap: Spacing.sm,
                      textAlign: 'left', width: '100%',
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: Radius.md,
                          backgroundColor: Colors.bgElevated,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <CalendarRange color={Colors.orange} size={20} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16,
                            color: Colors.white, textTransform: 'uppercase',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {macro.name}
                          </div>
                          <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>
                            {macro.traineeName} · {macro.durationWeeks} semanas · {mesoCount} mesociclos
                          </div>
                        </div>
                      </div>
                      <Badge label={statusLabel[macro.status] ?? macro.status} variant={statusVariant(macro.status)} />
                    </div>

                    {/* Progress bar */}
                    {macro.status === 'active' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{
                          height: 4, backgroundColor: Colors.bgElevated,
                          borderRadius: Radius.full, overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%', width: `${Math.round(progress * 100)}%`,
                            backgroundColor: Colors.orange, borderRadius: Radius.full,
                            transition: 'width 0.3s',
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>
                            {Math.round(progress * 100)}% completado
                          </span>
                          <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.orange }}>
                            {weeksLeft} sem. restantes
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Goal */}
                    {macro.goal && (
                      <div style={{
                        backgroundColor: Colors.bgElevated, borderRadius: Radius.sm,
                        padding: `${Spacing.xs}px ${Spacing.sm}px`,
                      }}>
                        <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>
                          Objetivo: <span style={{ color: Colors.white }}>{macro.goal}</span>
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Asesorados sin macrociclo */}
            {connections.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
                  ASESORADOS
                </span>
                {connections.map((c) => {
                  const hasMacro = macrocycles.some((m) => m.traineeId === c.traineeId);
                  return (
                    <Card
                      key={c.id}
                      icon={<Users color={hasMacro ? Colors.teal : Colors.gray} size={20} />}
                      title={c.traineeName}
                      description={hasMacro ? 'Con plan de periodización' : 'Sin plan asignado'}
                      badge={<Badge label={hasMacro ? 'CON PLAN' : 'SIN PLAN'} variant={hasMacro ? 'active' : 'default'} />}
                      onClick={() => navigate('/coach/periodization/create', { state: { traineeId: c.traineeId, traineeName: c.traineeName } })}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
