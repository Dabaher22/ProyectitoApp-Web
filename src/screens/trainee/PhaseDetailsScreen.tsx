import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ScreenHeader from '../../components/ScreenHeader';
import Spinner from '../../components/Spinner';
import BtnPrimary from '../../components/BtnPrimary';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import {
  getMesocycleById, getMacrocycleById,
  Mesocycle, Macrocycle,
  PHASE_LABELS, PHASE_COLORS,
} from '../../services/periodization';
import { getRoutineById, Routine } from '../../services/routines';

const PHASE_INFO: Record<string, { emoji: string; why: string; adapt: string; tips: string[] }> = {
  base: {
    emoji: '🏗️',
    why: 'Construimos la base aeróbica y de movimiento que sostendrá todo el trabajo posterior.',
    adapt: 'Tu cuerpo está adaptando tendones, ligamentos y capacidad cardiovascular.',
    tips: ['Prioriza la técnica sobre el peso', 'Mantén una intensidad moderada', 'Descansa adecuadamente'],
  },
  hypertrophy: {
    emoji: '💪',
    why: 'El objetivo es maximizar el volumen de entrenamiento para estimular el crecimiento muscular.',
    adapt: 'Tu cuerpo está reclutando más fibras musculares y creando nuevas conexiones neurales.',
    tips: ['Rangos de 8–15 repeticiones', 'Descanso de 60–90 segundos', 'Lleva un control de las cargas'],
  },
  strength: {
    emoji: '🏋️',
    why: 'Buscamos maximizar la fuerza máxima con cargas elevadas y bajo volumen.',
    adapt: 'El sistema nervioso central mejora la coordinación y reclutamiento muscular.',
    tips: ['Rangos de 3–6 repeticiones', 'Descanso de 3–5 minutos', 'Calienta progresivamente'],
  },
  peak: {
    emoji: '🎯',
    why: 'Preparación final para expresar todo el rendimiento acumulado.',
    adapt: 'Reducción de fatiga acumulada mientras mantienes la fuerza.',
    tips: ['Intensidad máxima, volumen reducido', 'Prioriza la recuperación', 'Visualiza el objetivo'],
  },
  deload: {
    emoji: '🌊',
    why: 'La recuperación activa es tan importante como el entrenamiento duro.',
    adapt: 'Tu cuerpo está supercompensando y consolidando las ganancias previas.',
    tips: ['Reduce peso al 50–60%', 'Mantén la técnica impecable', 'Duerme 8+ horas'],
  },
  custom: {
    emoji: '⚡',
    why: 'Esta fase está diseñada específicamente para tus objetivos particulares.',
    adapt: 'Las adaptaciones dependen del enfoque definido por tu coach.',
    tips: ['Sigue las indicaciones de tu coach', 'Comunica cómo te sientes', 'Registra tu progreso'],
  },
};

export default function PhaseDetailsScreen() {
  const navigate = useNavigate();
  const { phaseId } = useParams<{ phaseId: string }>();

  const [mesocycle, setMesocycle] = useState<Mesocycle | null>(null);
  const [macrocycle, setMacrocycle] = useState<Macrocycle | null>(null);
  const [weekRoutines, setWeekRoutines] = useState<(Routine | null)[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!phaseId) return;
    try {
      const meso = await getMesocycleById(phaseId);
      if (!meso) { setLoading(false); return; }
      setMesocycle(meso);

      const [macro, routines] = await Promise.all([
        getMacrocycleById(meso.macrocycleId),
        Promise.all(
          meso.microcycles.map((m) => m.routineId ? getRoutineById(m.routineId) : Promise.resolve(null))
        ),
      ]);
      setMacrocycle(macro);
      setWeekRoutines(routines);
    } catch (err) {
      console.error('Error cargando detalles de fase:', err);
    } finally {
      setLoading(false);
    }
  }, [phaseId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div>
        <ScreenHeader title="FASE" onBack={() => navigate('/trainee/journey/roadmap')} />
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <Spinner color={Colors.teal} size={32} />
        </div>
      </div>
    );
  }

  if (!mesocycle) {
    return (
      <div>
        <ScreenHeader title="FASE" onBack={() => navigate('/trainee/journey/roadmap')} />
        <div style={{ padding: Spacing.lg, textAlign: 'center' }}>
          <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>Fase no encontrada.</span>
        </div>
      </div>
    );
  }

  const color = PHASE_COLORS[mesocycle.phase];
  const info = PHASE_INFO[mesocycle.phase] ?? PHASE_INFO.custom;

  return (
    <div>
      <ScreenHeader title="DETALLE DE FASE" onBack={() => navigate('/trainee/journey/roadmap')} />

      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
        {/* Hero */}
        <div style={{
          backgroundColor: color + '15', border: `1px solid ${color}30`,
          borderRadius: Radius.lg, padding: Spacing.lg,
          display: 'flex', flexDirection: 'column', gap: Spacing.sm,
        }}>
          <div style={{ fontSize: 36 }}>{info.emoji}</div>
          <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 22, color: Colors.white, textTransform: 'uppercase' }}>
            {PHASE_LABELS[mesocycle.phase]}
          </div>
          <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: color }}>
            {mesocycle.name} · {mesocycle.durationWeeks} semanas
          </div>
        </div>

        {/* Por qué */}
        <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
            ¿POR QUÉ ESTA FASE?
          </span>
          <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.white, lineHeight: 1.7 }}>
            {info.why}
          </span>
        </div>

        {/* Adaptación */}
        <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
            QUÉ ESPERAR
          </span>
          <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.white, lineHeight: 1.7 }}>
            {info.adapt}
          </span>
        </div>

        {/* Tips */}
        <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
            RECOMENDACIONES
          </span>
          {info.tips.map((tip, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: Spacing.sm }}>
              <div style={{
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: color + '25', flexShrink: 0, marginTop: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 10, color }}>
                  {i + 1}
                </span>
              </div>
              <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.white, lineHeight: 1.6 }}>
                {tip}
              </span>
            </div>
          ))}
        </div>

        {/* Notas del coach */}
        {mesocycle.notes && (
          <div style={{
            backgroundColor: color + '10', border: `1px solid ${color}20`,
            borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.xs,
          }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: color, letterSpacing: 2 }}>
              NOTA DE TU COACH
            </span>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.white, lineHeight: 1.7 }}>
              "{mesocycle.notes}"
            </span>
          </div>
        )}

        {/* Semanas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
            SEMANAS
          </span>
          {mesocycle.microcycles.map((micro, idx) => {
            const routine = weekRoutines[idx];
            return (
              <div
                key={micro.weekNumber}
                style={{
                  backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md,
                  borderLeft: `3px solid ${routine ? color : Colors.bgElevated}`,
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.gray }}>
                    SEMANA {micro.weekNumber}
                  </span>
                  {routine && (
                    <span style={{ fontFamily: Fonts.mono, fontSize: 10, color }}>CON RUTINA</span>
                  )}
                </div>
                {routine && (
                  <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.white }}>
                    {routine.name}
                  </span>
                )}
                {micro.focus && (
                  <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>
                    🎯 {micro.focus}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <BtnPrimary
          label="IR A MI RUTINA →"
          onClick={() => navigate('/trainee/routine')}
          fullWidth
        />
      </div>
    </div>
  );
}
