import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, X, Repeat, Zap } from 'lucide-react';
import ScreenHeader from '../../components/ScreenHeader';
import BtnPrimary from '../../components/BtnPrimary';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { createCircuit, updateCircuit, CircuitExercise, Circuit } from '../../services/circuits';
import { useAuthStore } from '../../store/authStore';

const CIRCUIT_COLOR = '#B980FF';

function newExercise(): CircuitExercise {
  return { id: `ce_${Date.now()}_${Math.random()}`, name: '', reps: 10 };
}

export default function CreateCircuitScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const uid = useAuthStore((s) => s.uid)!;
  const editData = location.state as Circuit | null;
  const isEdit = !!editData?.id;

  const [name, setName] = useState(editData?.name ?? '');
  const [format, setFormat] = useState<'amrap' | 'emom'>(editData?.format ?? 'amrap');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(String(editData?.timeLimitMinutes ?? editData?.totalMinutes ?? 15));
  const [exercises, setExercises] = useState<CircuitExercise[]>(editData?.exercises ?? [newExercise()]);
  const [saving, setSaving] = useState(false);

  const updateExercise = (idx: number, patch: Partial<CircuitExercise>) => {
    setExercises((prev) => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
  };

  const removeExercise = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const canSave = name.trim() && Number(timeLimitMinutes) > 0 && exercises.length > 0 && exercises.every((e) => e.name.trim());

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        format,
        ...(format === 'amrap' ? { timeLimitMinutes: Number(timeLimitMinutes) } : { totalMinutes: Number(timeLimitMinutes) }),
        exercises: exercises.filter((e) => e.name.trim()),
      };
      if (isEdit) {
        await updateCircuit(editData!.id, data);
      } else {
        await createCircuit(uid, data);
      }
      navigate(-1);
    } catch {
      alert('No se pudo guardar el circuito. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const emomExerciseLabel = (idx: number) => {
    const total = Number(timeLimitMinutes) || 0;
    if (exercises.length === 0) return `Minuto ${idx + 1}`;
    // Show which minutes this exercise covers
    const covered: number[] = [];
    for (let m = 0; m < total; m++) {
      if (m % exercises.length === idx) covered.push(m + 1);
    }
    return `Min ${covered.slice(0, 3).join(', ')}${covered.length > 3 ? '...' : ''}`;
  };

  return (
    <div className="screen-full" style={{ display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader
        title={isEdit ? 'EDITAR CIRCUITO' : 'NUEVO CIRCUITO'}
        onBack={() => navigate(-1)}
        right={
          <button onClick={handleSave} disabled={!canSave || saving} style={{
            backgroundColor: canSave ? CIRCUIT_COLOR : Colors.bgElevated,
            borderRadius: Radius.md, height: 36, paddingLeft: 16, paddingRight: 16,
            border: 'none', cursor: canSave ? 'pointer' : 'default',
            fontFamily: Fonts.heading, fontWeight: 700, fontSize: 12,
            color: canSave ? Colors.white : Colors.gray,
          }}>
            {saving ? 'GUARDANDO…' : 'GUARDAR'}
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
        {/* Name */}
        <div>
          <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5, marginBottom: 6 }}>NOMBRE DEL CIRCUITO</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. MetCon, Finisher AMRAP, EMOM de fuerza..."
            style={{ width: '100%', height: 46, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: `1px solid ${Colors.bgPlaceholder}`, padding: '0 14px', fontFamily: Fonts.mono, fontSize: 13, color: Colors.white, outline: 'none', boxSizing: 'border-box' }}
            onFocus={(e) => (e.target.style.borderColor = CIRCUIT_COLOR)}
            onBlur={(e) => (e.target.style.borderColor = Colors.bgPlaceholder)}
          />
        </div>

        {/* Format picker */}
        <div>
          <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5, marginBottom: 8 }}>TIPO DE CIRCUITO</div>
          <div style={{ display: 'flex', gap: Spacing.sm }}>
            {(['amrap', 'emom'] as const).map((f) => (
              <button key={f} onClick={() => setFormat(f)} style={{
                flex: 1, height: 72, borderRadius: Radius.lg, border: `2px solid ${format === f ? CIRCUIT_COLOR : Colors.bgElevated}`,
                backgroundColor: format === f ? CIRCUIT_COLOR + '15' : Colors.bgCard,
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                {f === 'amrap' ? <Repeat color={format === f ? CIRCUIT_COLOR : Colors.gray} size={20} /> : <Zap color={format === f ? CIRCUIT_COLOR : Colors.gray} size={20} />}
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: format === f ? CIRCUIT_COLOR : Colors.gray, letterSpacing: 1 }}>{f.toUpperCase()}</span>
                <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: format === f ? Colors.white : Colors.gray, opacity: 0.7 }}>
                  {f === 'amrap' ? 'Máx. rondas en tiempo' : 'Un ejercicio por minuto'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div>
          <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5, marginBottom: 6 }}>
            {format === 'amrap' ? 'TIEMPO LÍMITE (minutos)' : 'DURACIÓN TOTAL (minutos)'}
          </div>
          <input
            type="number"
            value={timeLimitMinutes}
            onChange={(e) => setTimeLimitMinutes(e.target.value)}
            min={1}
            placeholder="15"
            style={{ width: '100%', height: 52, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: `1px solid ${Colors.bgPlaceholder}`, padding: '0 14px', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 24, color: CIRCUIT_COLOR, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
            onFocus={(e) => (e.target.style.borderColor = CIRCUIT_COLOR)}
            onBlur={(e) => (e.target.style.borderColor = Colors.bgPlaceholder)}
          />
          {format === 'emom' && Number(timeLimitMinutes) > 0 && exercises.length > 0 && (
            <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, marginTop: 6, textAlign: 'center' }}>
              {Number(timeLimitMinutes)} minutos · {exercises.length} ejercicio{exercises.length > 1 ? 's' : ''} rotando
            </div>
          )}
        </div>

        {/* Exercises */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>
            {format === 'amrap' ? 'EJERCICIOS DEL CIRCUITO (por ronda)' : 'EJERCICIOS (uno por minuto, rotan)'}
          </div>

          {exercises.map((ex, idx) => (
            <div key={ex.id} style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm, border: `1px solid ${Colors.bgElevated}` }}>
              {format === 'emom' && (
                <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: CIRCUIT_COLOR, letterSpacing: 0.5 }}>{emomExerciseLabel(idx)}</span>
              )}
              {format === 'amrap' && (
                <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray, letterSpacing: 0.5 }}>EJERCICIO {idx + 1}</span>
              )}
              <div style={{ display: 'flex', gap: Spacing.sm, alignItems: 'center' }}>
                <input
                  value={ex.name}
                  onChange={(e) => updateExercise(idx, { name: e.target.value })}
                  placeholder="Nombre del ejercicio"
                  style={{ flex: 1, height: 40, backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, border: `1px solid ${Colors.bgPlaceholder}`, padding: '0 10px', fontFamily: Fonts.mono, fontSize: 13, color: Colors.white, outline: 'none' }}
                  onFocus={(e) => (e.target.style.borderColor = CIRCUIT_COLOR)}
                  onBlur={(e) => (e.target.style.borderColor = Colors.bgPlaceholder)}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => updateExercise(idx, { reps: Math.max(1, ex.reps - 1) })} style={{ width: 28, height: 28, backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, border: 'none', cursor: 'pointer', color: Colors.white, fontSize: 16 }}>−</button>
                  <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, minWidth: 28, textAlign: 'center' }}>{ex.reps}</span>
                  <button onClick={() => updateExercise(idx, { reps: ex.reps + 1 })} style={{ width: 28, height: 28, backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, border: 'none', cursor: 'pointer', color: Colors.white, fontSize: 16 }}>+</button>
                </div>
                <button onClick={() => removeExercise(idx)} style={{ width: 32, height: 32, background: 'none', border: `1px solid ${Colors.bgElevated}`, borderRadius: Radius.sm, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X color={Colors.gray} size={14} />
                </button>
              </div>
            </div>
          ))}

          <button onClick={() => setExercises((prev) => [...prev, newExercise()])} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
            height: 44, backgroundColor: Colors.bgCard,
            borderRadius: Radius.md, border: `1px dashed ${CIRCUIT_COLOR}60`,
            cursor: 'pointer',
          }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = CIRCUIT_COLOR)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${CIRCUIT_COLOR}60`)}
          >
            <Plus color={CIRCUIT_COLOR} size={16} />
            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: CIRCUIT_COLOR }}>AGREGAR EJERCICIO</span>
          </button>
        </div>

        {/* Preview */}
        {canSave && (
          <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, border: `1px solid ${CIRCUIT_COLOR}30` }}>
            <div style={{ fontFamily: Fonts.mono, fontSize: 9, color: CIRCUIT_COLOR, letterSpacing: 0.5, marginBottom: 8 }}>PREVIEW</div>
            <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white }}>
              {format.toUpperCase()} {timeLimitMinutes} MIN — {name}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {exercises.filter((e) => e.name).map((e) => (
                <span key={e.id} style={{ backgroundColor: CIRCUIT_COLOR + '15', border: `1px solid ${CIRCUIT_COLOR}30`, borderRadius: Radius.sm, padding: '3px 8px', fontFamily: Fonts.mono, fontSize: 10, color: CIRCUIT_COLOR }}>
                  {e.name} ×{e.reps}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: Spacing.lg, backgroundColor: Colors.bgCard, borderTop: `1px solid ${Colors.bgElevated}` }}>
        <BtnPrimary
          label={saving ? 'GUARDANDO…' : isEdit ? 'GUARDAR CAMBIOS' : 'CREAR CIRCUITO'}
          onClick={handleSave}
          fullWidth
          disabled={!canSave || saving}
        />
      </div>
    </div>
  );
}
