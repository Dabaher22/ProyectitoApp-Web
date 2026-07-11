import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import ScreenHeader from '../../components/ScreenHeader';
import InputField from '../../components/InputField';
import BtnPrimary from '../../components/BtnPrimary';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { createMesocycle, MesocyclePhase, PHASE_LABELS, PHASE_COLORS } from '../../services/periodization';
import { useAuthStore } from '../../store/authStore';

interface LocationState {
  nextOrder?: number;
  startWeek?: number;
  macroTotalWeeks?: number;
  traineeId?: string;
}

const PHASE_PRESETS: { phase: MesocyclePhase; description: string; weeks: number }[] = [
  { phase: 'base', description: 'Acondicionamiento y trabajo aeróbico base', weeks: 3 },
  { phase: 'hypertrophy', description: 'Volumen moderado-alto, rangos 8–15 reps', weeks: 4 },
  { phase: 'strength', description: 'Intensidad alta, rangos 3–6 reps', weeks: 3 },
  { phase: 'peak', description: 'Activación pre-competición, máxima intensidad', weeks: 2 },
  { phase: 'deload', description: 'Descarga activa, volumen e intensidad reducidos', weeks: 1 },
  { phase: 'custom', description: 'Fase personalizada sin restricciones', weeks: 3 },
];

const WEEK_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function CreateMesocycleScreen() {
  const navigate = useNavigate();
  const { macrocycleId } = useParams<{ macrocycleId: string }>();
  const location = useLocation();
  const { uid } = useAuthStore();
  const state = (location.state ?? {}) as LocationState;

  const startWeek = state.startWeek ?? 1;
  const macroTotalWeeks = state.macroTotalWeeks ?? 0;

  const [selectedPhase, setSelectedPhase] = useState<MesocyclePhase>('hypertrophy');
  const [name, setName] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const endWeek = startWeek + durationWeeks - 1;
  const overflow = macroTotalWeeks > 0 ? Math.max(0, endWeek - macroTotalWeeks) : 0;

  const handlePhaseSelect = (phase: MesocyclePhase) => {
    const preset = PHASE_PRESETS.find((p) => p.phase === phase);
    setSelectedPhase(phase);
    if (!name) setName(PHASE_LABELS[phase]);
    if (preset) setDurationWeeks(preset.weeks);
  };

  const handleSave = async () => {
    if (!uid || !macrocycleId) return;
    if (!name.trim()) { setError('El nombre del mesociclo es requerido.'); return; }

    setSaving(true);
    setError('');
    try {
      await createMesocycle({
        macrocycleId,
        coachId: uid,
        traineeId: state.traineeId ?? '',
        name: name.trim(),
        phase: selectedPhase,
        durationWeeks,
        order: state.nextOrder ?? 0,
        notes: notes.trim(),
      });
      navigate(`/coach/periodization/${macrocycleId}`, { replace: true });
    } catch (err) {
      console.error('Error creando mesociclo:', err);
      setError('No se pudo crear el mesociclo. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const phaseColor = PHASE_COLORS[selectedPhase];
  const selectedPreset = PHASE_PRESETS.find((p) => p.phase === selectedPhase);

  return (
    <div>
      <ScreenHeader
        title="CREAR MESOCICLO"
        onBack={() => navigate(`/coach/periodization/${macrocycleId}`)}
      />

      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>

        {/* ── SEMANAS (protagonista) ── */}
        <div style={{
          backgroundColor: phaseColor + '12',
          border: `2px solid ${phaseColor}`,
          borderRadius: Radius.lg,
          padding: Spacing.lg,
          display: 'flex',
          flexDirection: 'column',
          gap: Spacing.md,
          transition: 'border-color 0.2s, background-color 0.2s',
        }}>
          {/* Rango grande */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: phaseColor, letterSpacing: 2, marginBottom: 4 }}>
                SEMANAS DE ESTE BLOQUE
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 52, color: Colors.white, lineHeight: 1 }}>
                  {startWeek}
                </span>
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 28, color: phaseColor }}>→</span>
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 52, color: overflow > 0 ? '#FF3B30' : Colors.white, lineHeight: 1 }}>
                  {endWeek}
                </span>
              </div>
              {overflow > 0 && (
                <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: '#FF3B30', marginTop: 4 }}>
                  ⚠ Se pasan {overflow} sem. del plan total
                </div>
              )}
            </div>
            <div style={{
              backgroundColor: phaseColor + '20',
              borderRadius: Radius.md,
              padding: `${Spacing.sm}px ${Spacing.md}px`,
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 32, color: phaseColor }}>
                {durationWeeks}
              </div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 9, color: phaseColor, letterSpacing: 1 }}>
                SEM
              </div>
            </div>
          </div>

          {/* Timeline visual del macrociclo */}
          {macroTotalWeeks > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray, letterSpacing: 1 }}>
                POSICIÓN EN EL PLAN ({macroTotalWeeks} SEMANAS TOTALES)
              </div>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {Array.from({ length: macroTotalWeeks }, (_, i) => {
                  const week = i + 1;
                  const isUsed = week < startWeek;
                  const isCurrent = week >= startWeek && week <= endWeek;
                  const isOver = week > macroTotalWeeks;
                  return (
                    <div
                      key={week}
                      style={{
                        width: Math.max(20, Math.min(32, Math.floor(280 / macroTotalWeeks))),
                        height: 32,
                        borderRadius: 4,
                        backgroundColor: isUsed
                          ? Colors.bgElevated
                          : isCurrent
                          ? phaseColor
                          : Colors.bgCard,
                        border: `1px solid ${isCurrent ? phaseColor : isUsed ? 'transparent' : Colors.bgElevated}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{
                        fontFamily: Fonts.heading,
                        fontWeight: 700,
                        fontSize: 11,
                        color: isCurrent ? Colors.blackText : isUsed ? Colors.gray + '80' : Colors.gray,
                      }}>
                        {week}
                      </span>
                    </div>
                  );
                })}
                {/* Overflow weeks (beyond macro) */}
                {overflow > 0 && Array.from({ length: overflow }, (_, i) => (
                  <div key={`over-${i}`} style={{
                    width: 28, height: 32, borderRadius: 4,
                    backgroundColor: '#FF3B3025',
                    border: '1px solid #FF3B3060',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 11, color: '#FF3B30' }}>
                      {macroTotalWeeks + i + 1}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: Spacing.md, marginTop: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: Colors.bgElevated }} />
                  <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray }}>Planificado</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: phaseColor }} />
                  <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray }}>Este bloque</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: Colors.bgCard, border: `1px solid ${Colors.bgElevated}` }} />
                  <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray }}>Disponible</span>
                </div>
              </div>
            </div>
          )}

          {/* Selector de duración dentro del card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 1 }}>
                AJUSTAR DURACIÓN
              </span>
              {selectedPreset && (
                <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: phaseColor }}>
                  Recomendado: {selectedPreset.weeks} sem
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: Spacing.xs }}>
              {WEEK_OPTIONS.map((w) => (
                <button
                  key={w}
                  onClick={() => setDurationWeeks(w)}
                  style={{
                    flex: 1,
                    backgroundColor: durationWeeks === w ? phaseColor : Colors.bgElevated,
                    border: 'none', borderRadius: Radius.sm,
                    padding: `${Spacing.sm}px 0`,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{
                    fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16,
                    color: durationWeeks === w ? Colors.blackText : Colors.white,
                  }}>
                    {w}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tipo de fase */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
            TIPO DE FASE
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
            {PHASE_PRESETS.map(({ phase, description }) => {
              const color = PHASE_COLORS[phase];
              const isSelected = selectedPhase === phase;
              return (
                <button
                  key={phase}
                  onClick={() => handlePhaseSelect(phase)}
                  style={{
                    backgroundColor: isSelected ? color + '15' : Colors.bgCard,
                    border: `1px solid ${isSelected ? color : Colors.bgElevated}`,
                    borderRadius: Radius.md, padding: Spacing.md,
                    display: 'flex', alignItems: 'center', gap: Spacing.sm,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: isSelected ? color : Colors.white }}>
                      {PHASE_LABELS[phase].toUpperCase()}
                    </div>
                    <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, marginTop: 2 }}>
                      {description}
                    </div>
                  </div>
                  {isSelected && (
                    <div style={{
                      width: 18, height: 18, borderRadius: 9, backgroundColor: color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <span style={{ color: Colors.blackText, fontSize: 11, fontWeight: 700 }}>✓</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Nombre */}
        <InputField
          label="Nombre del mesociclo"
          placeholder={`ej: Bloque ${PHASE_LABELS[selectedPhase]}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Notas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
          <label style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Indicaciones específicas para esta fase..."
            rows={3}
            style={{
              backgroundColor: Colors.bgElevated, borderRadius: Radius.md,
              padding: Spacing.md, fontFamily: Fonts.mono, fontSize: 12, color: Colors.white,
              border: '1px solid transparent', outline: 'none', resize: 'none',
              width: '100%', lineHeight: 1.6, boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.target.style.borderColor = phaseColor)}
            onBlur={(e) => (e.target.style.borderColor = 'transparent')}
          />
        </div>

        {error && (
          <div style={{
            backgroundColor: '#FF3B30' + '15', border: `1px solid #FF3B3050`,
            borderRadius: Radius.md, padding: Spacing.sm,
          }}>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: '#FF3B30' }}>{error}</span>
          </div>
        )}

        <BtnPrimary label="CREAR MESOCICLO" onClick={handleSave} loading={saving} fullWidth />
      </div>
    </div>
  );
}
