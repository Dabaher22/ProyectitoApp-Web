import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import InputField from '../../components/InputField';
import BtnPrimary from '../../components/BtnPrimary';
import ScreenHeader from '../../components/ScreenHeader';
import { Colors, Fonts, Spacing } from '../../theme';
import type { DayConfig } from './ExerciseSelectionScreen';

const DAYS = [1, 2, 3, 4, 5, 6, 7];

export default function CreateRoutineScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const editState = location.state as {
    editMode?: boolean;
    routineId?: string;
    routineName?: string;
    routineType?: string;
    routineDayCount?: number;
    dayConfigs?: DayConfig[];
    macrocycleId?: string;
    mesocycleId?: string;
    weekNumber?: number;
  } | null;

  const isEdit = editState?.editMode === true;

  const [name, setName] = useState(editState?.routineName ?? '');
  const [dayCount, setDayCount] = useState<number | null>(editState?.routineDayCount ?? null);

  const handleContinue = () => {
    if (!dayCount) return;
    const days = Array.from({ length: dayCount }, (_, i) => String(i + 1));
    let initialDayConfigs: DayConfig[] | undefined;
    if (isEdit && editState?.dayConfigs) {
      const existing = editState.dayConfigs;
      initialDayConfigs = days.map((n, i) => ({
        number: n,
        name: existing[i]?.name ?? '',
        exercises: existing[i]?.exercises ?? [],
      }));
    }

    navigate('/coach/exercise-selection', {
      state: {
        routineId: isEdit ? editState?.routineId : 'new',
        routineName: name,
        days,
        type: editState?.routineType ?? '',
        ...(initialDayConfigs ? { initialDayConfigs } : {}),
        ...(editState?.macrocycleId ? {
          macrocycleId: editState.macrocycleId,
          mesocycleId: editState.mesocycleId,
          weekNumber: editState.weekNumber,
        } : {}),
      },
    });
  };

  return (
    <div>
      <ScreenHeader title={isEdit ? 'EDITAR RUTINA' : 'CREAR RUTINA'} onBack={() => navigate(-1)} />
      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
        <InputField label="Nombre de la rutina" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Fuerza 3x por semana" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, letterSpacing: 0.5, textTransform: 'uppercase' }}>Días de entrenamiento por semana</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {DAYS.map((d) => (
              <button key={d} onClick={() => setDayCount(d)} style={{
                height: 44,
                backgroundColor: dayCount === d ? Colors.orange : Colors.bgElevated,
                borderRadius: 8,
                border: `1px solid ${dayCount === d ? Colors.orange : 'transparent'}`,
                cursor: 'pointer',
                fontFamily: Fonts.mono, fontWeight: 700, fontSize: 15,
                color: dayCount === d ? Colors.blackText : Colors.gray,
              }}>{d}</button>
            ))}
          </div>
          {dayCount && (
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, textAlign: 'center' }}>
              {dayCount} {dayCount === 1 ? 'día' : 'días'} por semana
            </span>
          )}
        </div>

        <BtnPrimary
          label={isEdit ? 'Continuar con ejercicios →' : 'Continuar →'}
          onClick={handleContinue}
          fullWidth
          disabled={!name || !dayCount}
        />
      </div>
    </div>
  );
}
