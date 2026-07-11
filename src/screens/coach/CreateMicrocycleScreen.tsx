import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Dumbbell, Check, Plus, Pencil } from 'lucide-react';
import type { DayConfig, ExerciseEntry } from './ExerciseSelectionScreen';

function buildDayConfigs(r: Routine): DayConfig[] {
  const dayMap = new Map<string, ExerciseEntry[]>();
  for (const e of r.exercises) {
    const day = (e as any).day ?? r.days[0] ?? 'Día 1';
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day)!.push({ ...e } as ExerciseEntry);
  }
  return r.days.map((dayName, i) => ({
    number: String(i + 1),
    name: dayName,
    exercises: dayMap.get(dayName) ?? [],
  }));
}
import ScreenHeader from '../../components/ScreenHeader';
import BtnPrimary from '../../components/BtnPrimary';
import Spinner from '../../components/Spinner';
import InputField from '../../components/InputField';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import {
  getMesocycleById, updateMicrocycleEntry,
  Mesocycle, PHASE_LABELS, PHASE_COLORS,
} from '../../services/periodization';
import { getRoutinesByMacrocycle, getRoutinesByCoach, Routine } from '../../services/routines';
import { useAuthStore } from '../../store/authStore';

export default function CreateMicrocycleScreen() {
  const navigate = useNavigate();
  const { macrocycleId, mesocycleId } = useParams<{ macrocycleId: string; mesocycleId: string }>();
  const { uid } = useAuthStore();

  const [mesocycle, setMesocycle] = useState<Mesocycle | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedRoutineId, setSelectedRoutineId] = useState('');
  const [focus, setFocus] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const load = useCallback(async () => {
    if (!mesocycleId || !macrocycleId) return;
    try {
      const meso = await getMesocycleById(mesocycleId);
      setMesocycle(meso);
      if (meso) {
        const first = meso.microcycles[0];
        if (first) {
          setSelectedWeek(first.weekNumber);
          setSelectedRoutineId(first.routineId ?? '');
          setFocus(first.focus ?? '');
          setNotes(first.notes ?? '');
        }
      }
    } catch (err) {
      console.error('Error cargando mesociclo:', err);
    } finally {
      setLoading(false);
    }
    // Cargar rutinas del macrociclo; si falla o está vacío, carga todas las del coach
    const coachId = uid;
    getRoutinesByMacrocycle(macrocycleId)
      .then((routs) => {
        if (routs.length > 0) { setRoutines(routs); return; }
        return coachId ? getRoutinesByCoach(coachId).then(setRoutines) : undefined;
      })
      .catch(() => { if (coachId) getRoutinesByCoach(coachId).then(setRoutines).catch(() => {}); });
  }, [mesocycleId, macrocycleId, uid]);

  useEffect(() => { load(); }, [load]);

  const handleWeekSelect = (weekNum: number) => {
    setSelectedWeek(weekNum);
    const entry = mesocycle?.microcycles.find((m) => m.weekNumber === weekNum);
    // Si la semana ya tiene una rutina guardada, mostrarla; si no, mantener la selección actual
    // para que el coach pueda asignar la misma rutina a múltiples semanas sin tener que re-seleccionar
    if (entry?.routineId) {
      setSelectedRoutineId(entry.routineId);
    }
    setFocus(entry?.focus ?? '');
    setNotes(entry?.notes ?? '');
  };

  const handleSaveWeek = async () => {
    if (!mesocycleId) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const selectedRoutine = routines.find((r) => r.id === selectedRoutineId);
      await updateMicrocycleEntry(mesocycleId, selectedWeek, {
        routineId: selectedRoutineId || undefined,
        routineName: selectedRoutine?.name,
        focus: focus.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (mesocycle) {
        setMesocycle({
          ...mesocycle,
          microcycles: mesocycle.microcycles.map((m) =>
            m.weekNumber === selectedWeek
              ? {
                  ...m,
                  routineId: selectedRoutineId || undefined,
                  routineName: selectedRoutine?.name,
                  focus: focus.trim() || undefined,
                  notes: notes.trim() || undefined,
                }
              : m
          ),
        });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      console.error('Error guardando semana:', err);
      setSaveError(err?.message ?? 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRoutine = () => {
    navigate('/coach/create-routine', {
      state: { macrocycleId, mesocycleId, weekNumber: selectedWeek },
    });
  };

  const handleEditRoutine = (r: Routine) => {
    navigate('/coach/create-routine', {
      state: {
        editMode: true,
        routineId: r.id,
        routineName: r.name,
        routineType: r.type,
        routineDayCount: r.days.length,
        dayConfigs: buildDayConfigs(r),
        macrocycleId,
        mesocycleId,
      },
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spinner color={Colors.orange} size={32} />
      </div>
    );
  }

  if (!mesocycle) {
    return (
      <div>
        <ScreenHeader title="NO ENCONTRADO" onBack={() => navigate(`/coach/periodization/${macrocycleId}`)} />
      </div>
    );
  }

  const phaseColor = PHASE_COLORS[mesocycle.phase];
  const currentEntry = mesocycle.microcycles.find((m) => m.weekNumber === selectedWeek);
  const currentRoutine = routines.find((r) => r.id === currentEntry?.routineId);

  return (
    <div>
      <ScreenHeader
        title="SEMANAS DEL BLOQUE"
        onBack={() => navigate(`/coach/periodization/${macrocycleId}`)}
      />

      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
        {/* Meso info */}
        <div style={{
          backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
          padding: Spacing.md, borderLeft: `3px solid ${phaseColor}`,
        }}>
          <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, textTransform: 'uppercase' }}>
            {mesocycle.name}
          </div>
          <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: phaseColor, marginTop: 2 }}>
            {PHASE_LABELS[mesocycle.phase].toUpperCase()} · {mesocycle.durationWeeks} SEMANAS
          </div>
        </div>

        {/* Selector de semana */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
            SEMANA
          </span>
          <div style={{ display: 'flex', gap: Spacing.xs, flexWrap: 'wrap' }}>
            {mesocycle.microcycles.map((micro) => {
              const isSelected = selectedWeek === micro.weekNumber;
              const hasRoutine = !!micro.routineId;
              return (
                <button
                  key={micro.weekNumber}
                  onClick={() => handleWeekSelect(micro.weekNumber)}
                  style={{
                    width: 52, height: 52,
                    backgroundColor: isSelected ? phaseColor : hasRoutine ? phaseColor + '20' : Colors.bgCard,
                    border: `1px solid ${isSelected ? phaseColor : hasRoutine ? phaseColor + '50' : Colors.bgElevated}`,
                    borderRadius: Radius.md, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                  }}
                >
                  <span style={{
                    fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15,
                    color: isSelected ? Colors.blackText : Colors.white,
                  }}>
                    {micro.weekNumber}
                  </span>
                  <span style={{
                    fontFamily: Fonts.mono, fontSize: 8, fontWeight: 700,
                    color: isSelected ? Colors.blackText + '99' : Colors.gray,
                  }}>
                    SEM
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Config de la semana seleccionada */}
        <div style={{
          backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
          padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.lg,
        }}>
          <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white }}>
            SEMANA {selectedWeek}
          </div>

          {/* Rutina */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
                RUTINA
              </span>
              <button
                onClick={handleCreateRoutine}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  backgroundColor: phaseColor, borderRadius: Radius.md,
                  height: 32, paddingLeft: 12, paddingRight: 12,
                  border: 'none', cursor: 'pointer',
                }}
              >
                <Plus size={13} color={Colors.blackText} />
                <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11, color: Colors.blackText }}>
                  CREAR RUTINA
                </span>
              </button>
            </div>

            {routines.length === 0 ? (
              <div style={{
                backgroundColor: Colors.bgElevated, borderRadius: Radius.lg,
                padding: Spacing.lg, textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Spacing.sm,
              }}>
                <Dumbbell color={Colors.gray} size={28} />
                <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, lineHeight: 1.6 }}>
                  Sin rutinas en este plan aún.{'\n'}Crea la primera con el botón de arriba.
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
                <button
                  onClick={() => setSelectedRoutineId('')}
                  style={{
                    backgroundColor: !selectedRoutineId ? Colors.bgElevated : 'transparent',
                    border: `1px solid ${!selectedRoutineId ? Colors.gray : Colors.bgElevated}`,
                    borderRadius: Radius.md, padding: `${Spacing.sm}px ${Spacing.md}px`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>Sin rutina esta semana</span>
                  {!selectedRoutineId && <Check size={14} color={Colors.gray} />}
                </button>
                {routines.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      backgroundColor: selectedRoutineId === r.id ? phaseColor + '15' : 'transparent',
                      border: `1px solid ${selectedRoutineId === r.id ? phaseColor : Colors.bgElevated}`,
                      borderRadius: Radius.md, padding: Spacing.md,
                      display: 'flex', alignItems: 'center', gap: Spacing.sm,
                    }}
                  >
                    <button
                      onClick={() => setSelectedRoutineId(r.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', minWidth: 0 }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: Radius.sm,
                        backgroundColor: Colors.bgElevated,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Dumbbell color={selectedRoutineId === r.id ? phaseColor : Colors.gray} size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12,
                          color: selectedRoutineId === r.id ? Colors.white : Colors.gray,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {r.name}
                        </div>
                        <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, marginTop: 2 }}>
                          {r.days.length} días · {r.exercises.length} ejercicios
                        </div>
                      </div>
                      {selectedRoutineId === r.id && <Check size={16} color={phaseColor} />}
                    </button>
                    <button
                      onClick={() => handleEditRoutine(r)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', flexShrink: 0 }}
                    >
                      <Pencil size={14} color={Colors.gray} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Focus */}
          <InputField
            label="Enfoque de la semana (opcional)"
            placeholder="ej: Priorizar técnica en sentadilla"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
          />

          {/* Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
            <label style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Indicaciones para el asesorado esta semana..."
              rows={2}
              style={{
                backgroundColor: Colors.bgElevated, borderRadius: Radius.md,
                padding: Spacing.md, fontFamily: Fonts.mono, fontSize: 12, color: Colors.white,
                border: '1px solid transparent', outline: 'none', resize: 'none', width: '100%', lineHeight: 1.6,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {saveError && (
            <div style={{ backgroundColor: '#FF3B3015', border: '1px solid #FF3B3050', borderRadius: Radius.md, padding: Spacing.sm }}>
              <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: '#FF3B30' }}>{saveError}</span>
            </div>
          )}
          {saveSuccess && (
            <div style={{ backgroundColor: Colors.teal + '15', border: `1px solid ${Colors.teal}50`, borderRadius: Radius.md, padding: Spacing.sm }}>
              <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.teal }}>✓ Semana {selectedWeek} guardada</span>
            </div>
          )}
          <BtnPrimary label={`GUARDAR SEMANA ${selectedWeek}`} onClick={handleSaveWeek} loading={saving} fullWidth />
        </div>

        {/* Resumen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>
            RESUMEN DEL BLOQUE
          </span>
          {mesocycle.microcycles.map((micro) => (
            <div
              key={micro.weekNumber}
              onClick={() => handleWeekSelect(micro.weekNumber)}
              style={{
                backgroundColor: Colors.bgCard, borderRadius: Radius.md,
                padding: Spacing.md, display: 'flex', alignItems: 'center', gap: Spacing.sm,
                borderLeft: `3px solid ${micro.routineId ? phaseColor : Colors.bgElevated}`,
                cursor: 'pointer',
              }}
            >
              <span style={{
                fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.gray,
                minWidth: 30, flexShrink: 0,
              }}>
                S{micro.weekNumber}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {micro.routineName ? (
                  <div style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {micro.routineName}
                  </div>
                ) : (
                  <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>Sin rutina</div>
                )}
                {micro.focus && (
                  <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, marginTop: 2 }}>{micro.focus}</div>
                )}
              </div>
              {micro.routineId && <Check size={14} color={phaseColor} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
