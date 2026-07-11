import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarRange, Check, Search, X, ChevronDown } from 'lucide-react';
import ScreenHeader from '../../components/ScreenHeader';
import InputField from '../../components/InputField';
import BtnPrimary from '../../components/BtnPrimary';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { createMacrocycle } from '../../services/periodization';
import { getConnectionsByCoach, Connection } from '../../services/connections';
import { useAuthStore } from '../../store/authStore';

const GOAL_PRESETS = [
  'Hipertrofia general',
  'Fuerza máxima',
  'Pérdida de grasa',
  'Resistencia muscular',
  'Preparación competición',
  'Recomposición corporal',
];

const DURATION_PRESETS = [8, 12, 16, 20, 24];
const TODAY = new Date().toISOString().split('T')[0];

interface LocationState {
  traineeId?: string;
  traineeName?: string;
}

export default function CreateMacrocycleScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { uid } = useAuthStore();
  const state = (location.state ?? {}) as LocationState;

  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(12);
  const [customDuration, setCustomDuration] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [startDate, setStartDate] = useState(TODAY);
  const [selectedTraineeId, setSelectedTraineeId] = useState(state.traineeId ?? '');
  const [selectedTraineeName, setSelectedTraineeName] = useState(state.traineeName ?? '');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.traineeId || !uid) return;
    setLoadingConnections(true);
    getConnectionsByCoach(uid)
      .then(setConnections)
      .finally(() => setLoadingConnections(false));
  }, [uid, state.traineeId]);

  useEffect(() => {
    if (selectorOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [selectorOpen]);

  const filteredConnections = connections.filter((c) =>
    c.traineeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectTrainee = (c: Connection) => {
    setSelectedTraineeId(c.traineeId);
    setSelectedTraineeName(c.traineeName);
    setSelectorOpen(false);
    setSearchQuery('');
  };

  const handleDurationPreset = (w: number) => {
    setDurationWeeks(w);
    setShowCustom(false);
    setCustomDuration('');
  };

  const handleCustomDuration = (val: string) => {
    setCustomDuration(val);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= 52) setDurationWeeks(n);
  };

  const handleSave = async () => {
    if (!uid) return;
    if (!name.trim()) { setError('El nombre del macrociclo es requerido.'); return; }
    if (!selectedTraineeId) { setError('Selecciona un asesorado.'); return; }
    if (durationWeeks < 1) { setError('La duración debe ser al menos 1 semana.'); return; }

    setSaving(true);
    setError('');
    try {
      const id = await createMacrocycle({
        coachId: uid,
        traineeId: selectedTraineeId,
        traineeName: selectedTraineeName,
        name: name.trim(),
        goal: goal.trim(),
        durationWeeks,
        startDate,
      });
      navigate(`/coach/periodization/${id}`, { replace: true });
    } catch (err) {
      console.error('Error creando macrociclo:', err);
      setError('No se pudo crear el macrociclo. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const endDate = (() => {
    if (!startDate) return '';
    const d = new Date(startDate);
    d.setDate(d.getDate() + durationWeeks * 7);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  return (
    <div>
      <ScreenHeader title="CREAR MACROCICLO" onBack={() => navigate('/coach/periodization')} />

      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>

        {/* ── Semanas protagonista ── */}
        <div style={{
          backgroundColor: Colors.orange + '12',
          border: `2px solid ${Colors.orange}`,
          borderRadius: Radius.lg,
          padding: Spacing.lg,
          display: 'flex',
          flexDirection: 'column',
          gap: Spacing.md,
        }}>
          <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.orange, letterSpacing: 2 }}>
            PLAN TOTAL
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 64, color: Colors.white, lineHeight: 1 }}>
                  {durationWeeks}
                </span>
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 24, color: Colors.orange }}>
                  semanas
                </span>
              </div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 4 }}>
                {startDate
                  ? `${new Date(startDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} → ${endDate}`
                  : 'Fecha de inicio: al activar el plan'}
              </div>
            </div>
            <div style={{
              backgroundColor: Colors.orange + '20', borderRadius: Radius.md,
              padding: `${Spacing.sm}px ${Spacing.md}px`, textAlign: 'center',
            }}>
              <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.orange }}>
                {Math.round(durationWeeks / 4.33 * 10) / 10}
              </div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.orange, letterSpacing: 1 }}>MESES</div>
            </div>
          </div>

          {/* Selector de duración */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
            <div style={{ display: 'flex', gap: Spacing.xs, flexWrap: 'wrap' }}>
              {DURATION_PRESETS.map((w) => (
                <button
                  key={w}
                  onClick={() => handleDurationPreset(w)}
                  style={{
                    flex: 1, minWidth: 44,
                    backgroundColor: durationWeeks === w && !showCustom ? Colors.orange : Colors.bgElevated,
                    border: 'none', borderRadius: Radius.sm,
                    padding: `${Spacing.sm}px 0`,
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                  }}
                >
                  <span style={{
                    fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18,
                    color: durationWeeks === w && !showCustom ? Colors.blackText : Colors.white,
                  }}>{w}</span>
                  <span style={{
                    fontFamily: Fonts.mono, fontSize: 8, fontWeight: 700,
                    color: durationWeeks === w && !showCustom ? Colors.blackText : Colors.gray,
                  }}>SEM</span>
                </button>
              ))}
              <button
                onClick={() => { setShowCustom(true); }}
                style={{
                  flex: 1, minWidth: 44,
                  backgroundColor: showCustom ? Colors.orange : Colors.bgElevated,
                  border: 'none', borderRadius: Radius.sm,
                  padding: `${Spacing.sm}px 0`,
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                }}
              >
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: showCustom ? Colors.blackText : Colors.white }}>+</span>
                <span style={{ fontFamily: Fonts.mono, fontSize: 8, fontWeight: 700, color: showCustom ? Colors.blackText : Colors.gray }}>OTRA</span>
              </button>
            </div>
            {showCustom && (
              <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
                <input
                  autoFocus
                  type="number"
                  min={1}
                  max={52}
                  value={customDuration}
                  onChange={(e) => handleCustomDuration(e.target.value)}
                  placeholder="ej: 18"
                  style={{
                    flex: 1, height: 44, backgroundColor: Colors.bgElevated,
                    borderRadius: Radius.md, paddingLeft: Spacing.md, paddingRight: Spacing.md,
                    fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.white,
                    border: `1px solid ${Colors.orange}`, outline: 'none',
                  }}
                />
                <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>semanas (1–52)</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Asesorado ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
            ASESORADO
          </span>
          {state.traineeId ? (
            <div style={{
              backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
              padding: Spacing.md, display: 'flex', alignItems: 'center', gap: Spacing.sm,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.teal + '25',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.teal }}>
                  {selectedTraineeName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.white }}>
                {selectedTraineeName}
              </span>
            </div>
          ) : (
            <div>
              {/* Trigger / selected display */}
              <button
                onClick={() => setSelectorOpen((o) => !o)}
                style={{
                  width: '100%', backgroundColor: Colors.bgCard,
                  border: `1px solid ${selectedTraineeId ? Colors.orange : Colors.bgElevated}`,
                  borderRadius: Radius.lg, padding: Spacing.md,
                  display: 'flex', alignItems: 'center', gap: Spacing.sm,
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                {selectedTraineeId ? (
                  <>
                    <div style={{
                      width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.orange + '25',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.orange }}>
                        {selectedTraineeName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span style={{ flex: 1, fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.white }}>
                      {selectedTraineeName}
                    </span>
                    <Check size={16} color={Colors.orange} />
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontFamily: Fonts.mono, fontSize: 13, color: Colors.gray }}>
                      Selecciona un asesorado...
                    </span>
                    <ChevronDown size={16} color={Colors.gray} style={{ transform: selectorOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </>
                )}
              </button>

              {/* Dropdown */}
              {selectorOpen && (
                <div style={{
                  marginTop: 4,
                  backgroundColor: Colors.bgCard,
                  border: `1px solid ${Colors.bgElevated}`,
                  borderRadius: Radius.lg,
                  overflow: 'hidden',
                }}>
                  {/* Search */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: Spacing.sm,
                    padding: Spacing.sm,
                    borderBottom: `1px solid ${Colors.bgElevated}`,
                  }}>
                    <Search size={16} color={Colors.gray} style={{ flexShrink: 0 }} />
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar asesorado..."
                      style={{
                        flex: 1, background: 'none', border: 'none', outline: 'none',
                        fontFamily: Fonts.mono, fontSize: 13, color: Colors.white,
                      }}
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                        <X size={14} color={Colors.gray} />
                      </button>
                    )}
                  </div>

                  {/* Results */}
                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {loadingConnections ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: Spacing.lg }}>
                        <Spinner color={Colors.orange} size={20} />
                      </div>
                    ) : filteredConnections.length === 0 ? (
                      <div style={{ padding: Spacing.md, textAlign: 'center' }}>
                        <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>
                          {searchQuery ? 'Sin resultados' : 'Sin asesorados'}
                        </span>
                      </div>
                    ) : (
                      filteredConnections.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectTrainee(c)}
                          style={{
                            width: '100%', padding: `${Spacing.sm}px ${Spacing.md}px`,
                            backgroundColor: selectedTraineeId === c.traineeId ? Colors.orange + '15' : 'transparent',
                            border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: Spacing.sm, textAlign: 'left',
                          }}
                        >
                          <div style={{
                            width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.bgElevated,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray }}>
                              {c.traineeName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span style={{ flex: 1, fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.white }}>
                            {c.traineeName}
                          </span>
                          {selectedTraineeId === c.traineeId && <Check size={14} color={Colors.orange} />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Nombre ── */}
        <InputField
          label="Nombre del macrociclo"
          placeholder="ej: Preparación competición 2025"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* ── Objetivo ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
            OBJETIVO
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: Spacing.xs }}>
            {GOAL_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setGoal(goal === preset ? '' : preset)}
                style={{
                  backgroundColor: goal === preset ? Colors.orange + '20' : Colors.bgElevated,
                  border: `1px solid ${goal === preset ? Colors.orange : 'transparent'}`,
                  borderRadius: Radius.full, padding: `${Spacing.xs}px 12px`,
                  cursor: 'pointer',
                  fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11,
                  color: goal === preset ? Colors.orange : Colors.gray,
                }}
              >
                {preset}
              </button>
            ))}
          </div>
          <InputField
            label="O escribe un objetivo personalizado"
            placeholder="ej: Aumentar fuerza en sentadilla"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
        </div>

        {/* ── Fecha de inicio ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
          <label style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Fecha de inicio
          </label>
          <div style={{ display: 'flex', gap: Spacing.sm, alignItems: 'center' }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                flex: 1, height: 48, backgroundColor: Colors.bgElevated,
                borderRadius: Radius.md, paddingLeft: Spacing.md, paddingRight: Spacing.md,
                fontFamily: Fonts.mono, fontSize: 13, color: Colors.white,
                border: `1px solid ${startDate === TODAY ? Colors.orange : 'transparent'}`,
                outline: 'none', colorScheme: 'dark',
              }}
            />
            <button
              onClick={() => setStartDate('')}
              style={{
                height: 48, paddingLeft: Spacing.sm, paddingRight: Spacing.sm,
                backgroundColor: startDate === '' ? Colors.teal + '25' : Colors.bgElevated,
                borderRadius: Radius.md, border: `1px solid ${startDate === '' ? Colors.teal : 'transparent'}`,
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <span style={{
                fontFamily: Fonts.mono, fontWeight: 700, fontSize: 10,
                color: startDate === '' ? Colors.teal : Colors.gray,
              }}>
                AL ACTIVAR
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#FF3B30' + '15', border: `1px solid #FF3B3050`,
            borderRadius: Radius.md, padding: Spacing.sm,
          }}>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: '#FF3B30' }}>{error}</span>
          </div>
        )}

        <BtnPrimary label="CREAR MACROCICLO" onClick={handleSave} loading={saving} fullWidth />
      </div>
    </div>
  );
}
