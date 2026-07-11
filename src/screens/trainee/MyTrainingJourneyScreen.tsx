import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Route, ChevronRight, Dumbbell, CalendarRange, BarChart3 } from 'lucide-react';
import Spinner from '../../components/Spinner';
import BtnPrimary from '../../components/BtnPrimary';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import {
  getMacrocyclesByTrainee, getMesocyclesByMacrocycle,
  getActiveMacrocycle, getCurrentMesocycle, getCurrentMicrocycle,
  Macrocycle, Mesocycle, MicrocycleEntry,
  PHASE_LABELS, PHASE_COLORS, getMacrocycleProgress, getWeeksRemaining,
} from '../../services/periodization';
import { getRoutinesByTrainee, Routine } from '../../services/routines';
import { useAuthStore } from '../../store/authStore';

export default function MyTrainingJourneyScreen() {
  const navigate = useNavigate();
  const { uid } = useAuthStore();

  const [macro, setMacro] = useState<Macrocycle | null>(null);
  const [currentMeso, setCurrentMeso] = useState<Mesocycle | null>(null);
  const [currentMicro, setCurrentMicro] = useState<MicrocycleEntry | null>(null);
  const [currentRoutine, setCurrentRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const macros = await getMacrocyclesByTrainee(uid);
      const active = getActiveMacrocycle(macros);
      if (!active) { setLoading(false); return; }

      const [mesos, routines] = await Promise.all([
        getMesocyclesByMacrocycle(active.id),
        getRoutinesByTrainee(uid),
      ]);

      const meso = getCurrentMesocycle(mesos, active);
      const micro = meso ? getCurrentMicrocycle(meso, active) : null;
      const routine = micro?.routineId ? routines.find((r) => r.id === micro.routineId) ?? null : null;

      setMacro(active);
      setCurrentMeso(meso);
      setCurrentMicro(micro);
      setCurrentRoutine(routine);
    } catch (err) {
      console.error('Error cargando journey:', err);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spinner color={Colors.teal} size={32} />
      </div>
    );
  }

  if (!macro) {
    return (
      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
        <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 22, color: Colors.white, letterSpacing: 1 }}>
          MI JOURNEY
        </div>
        <div style={{
          backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
          padding: Spacing.xl, textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Spacing.md,
        }}>
          <Route color={Colors.gray} size={40} />
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.white }}>
            Sin plan activo
          </span>
          <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, lineHeight: 1.6 }}>
            Tu coach aún no ha creado un plan de periodización para ti.
          </span>
        </div>
      </div>
    );
  }

  const progress = getMacrocycleProgress(macro);
  const weeksLeft = getWeeksRemaining(macro);
  const phaseColor = currentMeso ? PHASE_COLORS[currentMeso.phase] : Colors.orange;

  return (
    <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
      {/* Header */}
      <div>
        <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 22, color: Colors.white, letterSpacing: 1 }}>
          MI JOURNEY
        </div>
        <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, marginTop: 2 }}>
          {macro.goal || 'Plan de entrenamiento activo'}
        </div>
      </div>

      {/* Current phase card */}
      {currentMeso && (
        <div style={{
          backgroundColor: phaseColor + '15',
          border: `1px solid ${phaseColor}30`,
          borderRadius: Radius.lg, padding: Spacing.lg,
          display: 'flex', flexDirection: 'column', gap: Spacing.md,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: phaseColor, letterSpacing: 1 }}>
                FASE ACTUAL
              </div>
              <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.white, marginTop: 4 }}>
                {PHASE_LABELS[currentMeso.phase].toUpperCase()}
              </div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, marginTop: 2 }}>
                {currentMeso.name}
              </div>
            </div>
            {currentMicro && (
              <div style={{
                backgroundColor: phaseColor + '25',
                borderRadius: Radius.md, padding: `${Spacing.xs}px ${Spacing.sm}px`,
                textAlign: 'center',
              }}>
                <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: phaseColor }}>
                  S{currentMicro.weekNumber}
                </div>
                <div style={{ fontFamily: Fonts.mono, fontSize: 8, color: phaseColor }}>SEMANA</div>
              </div>
            )}
          </div>

          {currentMicro?.focus && (
            <div style={{
              backgroundColor: Colors.bgPage + '80',
              borderRadius: Radius.sm, padding: `${Spacing.xs}px ${Spacing.sm}px`,
            }}>
              <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.white }}>
                🎯 {currentMicro.focus}
              </span>
            </div>
          )}

          {currentMicro?.notes && (
            <div style={{
              backgroundColor: Colors.bgPage + '80',
              borderRadius: Radius.sm, padding: `${Spacing.xs}px ${Spacing.sm}px`,
            }}>
              <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, lineHeight: 1.5 }}>
                📋 {currentMicro.notes}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Rutina del día */}
      {currentRoutine ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
            RUTINA DE ESTA SEMANA
          </span>
          <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
              <div style={{
                width: 44, height: 44, borderRadius: Radius.md,
                backgroundColor: Colors.bgElevated,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Dumbbell color={Colors.teal} size={22} />
              </div>
              <div>
                <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, textTransform: 'uppercase' }}>
                  {currentRoutine.name}
                </div>
                <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>
                  {currentRoutine.days.length} días/semana · {currentRoutine.exercises.length} ejercicios
                </div>
              </div>
            </div>
            <BtnPrimary
              label="IR A MI RUTINA →"
              onClick={() => navigate('/trainee/routine')}
              fullWidth
            />
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md }}>
          <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>
            Sin rutina asignada para esta semana — consulta a tu coach.
          </span>
        </div>
      )}

      {/* Macrocycle progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
        <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
          PROGRESO DEL PLAN
        </span>
        <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white, textTransform: 'uppercase' }}>
            {macro.name}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 8, backgroundColor: Colors.bgElevated, borderRadius: Radius.full, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.round(progress * 100)}%`,
                backgroundColor: Colors.orange, borderRadius: Radius.full,
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>
                {Math.round(progress * 100)}% completado
              </span>
              <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.orange }}>
                {weeksLeft} semanas restantes
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
        <button
          onClick={() => navigate('/trainee/journey/roadmap')}
          style={{
            backgroundColor: Colors.bgCard, borderRadius: Radius.md,
            padding: Spacing.md, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: Spacing.sm, textAlign: 'left',
          }}
        >
          <Route color={Colors.gray} size={18} />
          <span style={{ flex: 1, fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.white }}>
            VER ROADMAP COMPLETO
          </span>
          <ChevronRight color={Colors.gray} size={16} />
        </button>
        <button
          onClick={() => navigate('/trainee/journey/analytics')}
          style={{
            backgroundColor: Colors.bgCard, borderRadius: Radius.md,
            padding: Spacing.md, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: Spacing.sm, textAlign: 'left',
          }}
        >
          <BarChart3 color={Colors.gray} size={18} />
          <span style={{ flex: 1, fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.white }}>
            MIS ESTADÍSTICAS
          </span>
          <ChevronRight color={Colors.gray} size={16} />
        </button>
      </div>
    </div>
  );
}
