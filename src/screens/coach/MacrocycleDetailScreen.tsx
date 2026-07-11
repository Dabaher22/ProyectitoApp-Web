import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarRange, Plus, Trash2, ChevronRight } from 'lucide-react';
import ScreenHeader from '../../components/ScreenHeader';
import Badge from '../../components/Badge';
import Spinner from '../../components/Spinner';
import BtnPrimary from '../../components/BtnPrimary';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import {
  getMacrocycleById, getMesocyclesByMacrocycle,
  deleteMesocycle, deleteMacrocycle, updateMacrocycle,
  Macrocycle, Mesocycle, PHASE_LABELS, PHASE_COLORS,
  getMacrocycleProgress, getWeeksRemaining,
} from '../../services/periodization';

export default function MacrocycleDetailScreen() {
  const navigate = useNavigate();
  const { macrocycleId } = useParams<{ macrocycleId: string }>();
  const [macro, setMacro] = useState<Macrocycle | null>(null);
  const [mesocycles, setMesocycles] = useState<Mesocycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

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
      console.error('Error cargando macrociclo:', err);
    } finally {
      setLoading(false);
    }
  }, [macrocycleId]);

  useEffect(() => { load(); }, [load]);

  const handleActivate = async () => {
    if (!macrocycleId || !macro) return;
    const newStatus = macro.status === 'active' ? 'draft' : 'active';
    const updates: Record<string, any> = { status: newStatus };
    if (newStatus === 'active' && !macro.startDate) {
      updates.startDate = new Date().toISOString().split('T')[0];
    }
    await updateMacrocycle(macrocycleId, updates);
    setMacro({ ...macro, status: newStatus, ...(updates.startDate ? { startDate: updates.startDate } : {}) });
  };

  const handleDeleteMeso = async (mesoId: string) => {
    if (!confirm('¿Eliminar este mesociclo?')) return;
    await deleteMesocycle(mesoId);
    setMesocycles((prev) => prev.filter((m) => m.id !== mesoId));
  };

  const handleDeleteMacro = async () => {
    if (!macrocycleId) return;
    if (!confirm('¿Eliminar este macrociclo y todos sus mesociclos?')) return;
    setDeleting(true);
    try {
      await deleteMacrocycle(macrocycleId);
      navigate('/coach/periodization', { replace: true });
    } catch (err) {
      console.error('Error eliminando macrociclo:', err);
      setDeleting(false);
    }
  };

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
        <ScreenHeader title="NO ENCONTRADO" onBack={() => navigate('/coach/periodization')} />
        <div style={{ padding: Spacing.lg, textAlign: 'center' }}>
          <span style={{ fontFamily: Fonts.mono, fontSize: 13, color: Colors.gray }}>
            Macrociclo no encontrado.
          </span>
        </div>
      </div>
    );
  }

  const progress = getMacrocycleProgress(macro);
  const weeksLeft = getWeeksRemaining(macro);
  const totalWeeksAssigned = mesocycles.reduce((acc, m) => acc + m.durationWeeks, 0);
  const planFull = totalWeeksAssigned >= macro.durationWeeks;

  return (
    <div>
      <ScreenHeader
        title={macro.name.toUpperCase()}
        onBack={() => navigate('/coach/periodization')}
        right={
          <button
            onClick={() => navigate(`/coach/periodization/timeline/${macrocycleId}`)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          >
            <CalendarRange color={Colors.gray} size={22} />
          </button>
        }
      />

      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
        {/* Header card */}
        <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>
                {macro.traineeName}
              </div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>
                {macro.durationWeeks} semanas · inicia {new Date(macro.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <Badge
              label={macro.status === 'active' ? 'ACTIVO' : macro.status === 'completed' ? 'COMPLETADO' : 'BORRADOR'}
              variant={macro.status === 'active' ? 'active' : 'default'}
            />
          </div>

          {macro.goal && (
            <div style={{ backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, padding: `${Spacing.xs}px ${Spacing.sm}px` }}>
              <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>
                Objetivo: <span style={{ color: Colors.white }}>{macro.goal}</span>
              </span>
            </div>
          )}

          {/* Progress */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>Progreso del plan</span>
              <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.orange }}>
                {Math.round(progress * 100)}%
              </span>
            </div>
            <div style={{ height: 6, backgroundColor: Colors.bgElevated, borderRadius: Radius.full, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.round(progress * 100)}%`,
                backgroundColor: Colors.orange, borderRadius: Radius.full,
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>
                {totalWeeksAssigned}/{macro.durationWeeks} sem. planificadas
              </span>
              <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>
                {weeksLeft} sem. restantes
              </span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: Spacing.sm }}>
            <button
              onClick={handleActivate}
              style={{
                flex: 1, height: 40,
                backgroundColor: macro.status === 'active' ? Colors.bgElevated : Colors.orange,
                borderRadius: Radius.md, border: 'none', cursor: 'pointer',
                fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12,
                color: macro.status === 'active' ? Colors.gray : Colors.blackText,
              }}
            >
              {macro.status === 'active' ? 'DESACTIVAR' : 'ACTIVAR'}
            </button>
            <button
              onClick={handleDeleteMacro}
              disabled={deleting}
              style={{
                height: 40, paddingLeft: 16, paddingRight: 16,
                backgroundColor: 'transparent', border: `1px solid ${Colors.bgElevated}`,
                borderRadius: Radius.md, cursor: 'pointer',
                fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.gray,
              }}
            >
              {deleting ? '...' : 'ELIMINAR'}
            </button>
          </div>
        </div>

        {/* Mesociclos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
              ESTRUCTURA
            </span>
            <button
              disabled={planFull}
              onClick={() => !planFull && navigate(`/coach/periodization/${macrocycleId}/create-meso`, {
                state: {
                  nextOrder: mesocycles.length,
                  startWeek: totalWeeksAssigned + 1,
                  macroTotalWeeks: macro.durationWeeks,
                  traineeId: macro.traineeId,
                },
              })}
              style={{
                backgroundColor: planFull ? Colors.bgElevated : Colors.orange,
                borderRadius: Radius.md,
                height: 32, paddingLeft: 12, paddingRight: 12,
                border: 'none', cursor: planFull ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                opacity: planFull ? 0.5 : 1,
              }}
            >
              <Plus size={14} color={planFull ? Colors.gray : Colors.blackText} />
              <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11, color: planFull ? Colors.gray : Colors.blackText }}>MESO</span>
            </button>
          </div>

          {planFull && (
            <div style={{
              backgroundColor: Colors.teal + '15',
              border: `1px solid ${Colors.teal}40`,
              borderRadius: Radius.md,
              padding: `${Spacing.xs}px ${Spacing.sm}px`,
            }}>
              <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.teal }}>
                ✓ Plan completo — {totalWeeksAssigned}/{macro.durationWeeks} semanas planificadas
              </span>
            </div>
          )}

          {mesocycles.length === 0 ? (
            <div style={{
              backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
              padding: Spacing.xl, textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Spacing.md,
            }}>
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white }}>
                Sin mesociclos
              </span>
              <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, lineHeight: 1.6 }}>
                Agrega los bloques de entrenamiento que componen este macrociclo.
              </span>
              <button
                onClick={() => navigate(`/coach/periodization/${macrocycleId}/create-meso`, {
                state: { nextOrder: 0, startWeek: 1, macroTotalWeeks: macro.durationWeeks, traineeId: macro.traineeId },
              })}
                style={{
                  backgroundColor: Colors.orange, borderRadius: Radius.md,
                  height: 44, paddingLeft: 20, paddingRight: 20,
                  border: 'none', cursor: 'pointer',
                  fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.blackText,
                }}
              >
                + AGREGAR MESOCICLO
              </button>
            </div>
          ) : (
            mesocycles.map((meso, idx) => {
              const phaseColor = PHASE_COLORS[meso.phase];
              return (
                <div key={meso.id} style={{ position: 'relative' }}>
                  {/* Connector line */}
                  {idx < mesocycles.length - 1 && (
                    <div style={{
                      position: 'absolute', left: 20, top: '100%', width: 2,
                      height: Spacing.sm, backgroundColor: Colors.bgElevated, zIndex: 0,
                    }} />
                  )}
                  <div
                    onClick={() => navigate(`/coach/periodization/${macrocycleId}/${meso.id}/create-micro`)}
                    style={{
                      width: '100%', backgroundColor: Colors.bgCard,
                      borderRadius: Radius.lg, padding: Spacing.md,
                      border: `1px solid ${phaseColor}30`,
                      borderLeft: `3px solid ${phaseColor}`,
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', gap: Spacing.sm,
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white, textTransform: 'uppercase' }}>
                            {meso.name}
                          </div>
                          <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: phaseColor }}>
                            {PHASE_LABELS[meso.phase].toUpperCase()} · {meso.durationWeeks} SEMANAS
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.xs }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteMeso(meso.id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
                        >
                          <Trash2 color={Colors.gray} size={15} />
                        </button>
                        <ChevronRight color={Colors.gray} size={16} />
                      </div>
                    </div>

                    {/* Week pills */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {meso.microcycles.map((micro) => (
                        <div
                          key={micro.weekNumber}
                          style={{
                            backgroundColor: micro.routineId ? phaseColor + '25' : Colors.bgElevated,
                            border: `1px solid ${micro.routineId ? phaseColor + '50' : 'transparent'}`,
                            borderRadius: Radius.sm, padding: '2px 8px',
                            fontFamily: Fonts.mono, fontWeight: 700, fontSize: 10,
                            color: micro.routineId ? phaseColor : Colors.gray,
                          }}
                        >
                          S{micro.weekNumber}{micro.routineName ? ` · ${micro.routineName}` : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Vista timeline */}
        {mesocycles.length > 0 && (
          <button
            onClick={() => navigate(`/coach/periodization/timeline/${macrocycleId}`)}
            style={{
              height: 48, backgroundColor: Colors.bgCard, borderRadius: Radius.md,
              border: `1px solid ${Colors.bgElevated}`, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
            }}
          >
            <CalendarRange color={Colors.gray} size={18} />
            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.gray }}>
              VER TIMELINE
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
