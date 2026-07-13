import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, X, Repeat, Zap, Timer, Film } from 'lucide-react';
import ScreenHeader from '../../components/ScreenHeader';
import BtnPrimary from '../../components/BtnPrimary';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { createCircuit, updateCircuit, CircuitExercise, Circuit } from '../../services/circuits';
import { useAuthStore } from '../../store/authStore';
import { GIF_MUSCLES } from '../../data/gifLibrary';
import { GifMeta, getGifLibrary } from '../../services/gifLibrary';

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

  // Cardio
  const [showCardioModal, setShowCardioModal] = useState(false);
  const [cardioName, setCardioName] = useState('');
  const [cardioDuration, setCardioDuration] = useState(20);

  // GIF picker
  const [gifModal, setGifModal] = useState<{ exId: string; name: string; currentUrl: string } | null>(null);
  const [gifActiveTab, setGifActiveTab] = useState(GIF_MUSCLES[0]);
  const [gifItems, setGifItems] = useState<GifMeta[]>([]);
  const [gifLoading, setGifLoading] = useState(false);

  const updateExercise = (idx: number, patch: Partial<CircuitExercise>) => {
    setExercises((prev) => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
  };

  const removeExercise = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const addCardio = () => {
    if (!cardioName.trim()) return;
    setExercises((prev) => [...prev, {
      id: `ce_${Date.now()}_${Math.random()}`,
      name: cardioName.trim(),
      reps: 0,
      type: 'cardio',
      durationMinutes: cardioDuration,
    }]);
    setCardioName('');
    setCardioDuration(20);
    setShowCardioModal(false);
  };

  const addSuperserie = (exIdx: number, size: 2 | 3) => {
    const groupId = `bs_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setExercises((prev) => {
      const exs = [...prev];
      exs[exIdx] = { ...exs[exIdx], supersetGroupId: groupId };
      const partners = Array.from({ length: size - 1 }, () => ({ ...newExercise(), supersetGroupId: groupId }));
      exs.splice(exIdx + 1, 0, ...partners);
      return exs;
    });
  };

  const removeSuperserie = (exIdx: number) => {
    setExercises((prev) => {
      const exs = [...prev];
      const groupId = exs[exIdx].supersetGroupId;
      exs[exIdx] = { ...exs[exIdx], supersetGroupId: undefined };
      while (exs[exIdx + 1]?.supersetGroupId === groupId) {
        exs.splice(exIdx + 1, 1);
      }
      return exs;
    });
  };

  const openGifModal = (exId: string, name: string, currentUrl: string) => {
    setGifModal({ exId, name, currentUrl });
    if (gifItems.length === 0) {
      setGifLoading(true);
      getGifLibrary().then((items) => { setGifItems(items); setGifLoading(false); });
    }
  };

  const updateGifUrl = (exId: string, url: string) => {
    setExercises((prev) => prev.map((e) => e.id === exId ? { ...e, gifUrl: url || undefined } : e));
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

          {(() => {
            const posLabel = (idx: number) => format === 'emom' ? emomExerciseLabel(idx) : `EJERCICIO ${idx + 1}`;
            const posColor = (idx: number) => format === 'emom' ? CIRCUIT_COLOR : Colors.gray;

            const exerciseCard = (ex: CircuitExercise, idx: number) => (
              <div key={ex.id} style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm, border: `1px solid ${Colors.bgElevated}` }}>
                <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: posColor(idx), letterSpacing: 0.5 }}>{posLabel(idx)}</span>
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
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openGifModal(ex.id, ex.name || 'Ejercicio', ex.gifUrl ?? '')} style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: ex.gifUrl ? CIRCUIT_COLOR + '20' : Colors.bgElevated, border: `1px solid ${ex.gifUrl ? CIRCUIT_COLOR + '60' : 'transparent'}`, borderRadius: Radius.md, padding: '4px 10px', cursor: 'pointer' }}>
                    <Film color={ex.gifUrl ? CIRCUIT_COLOR : Colors.gray} size={12} />
                    <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: ex.gifUrl ? CIRCUIT_COLOR : Colors.gray }}>{ex.gifUrl ? 'GIF ✓' : '+GIF'}</span>
                  </button>
                  {!ex.supersetGroupId && (
                    <>
                      <button onClick={() => addSuperserie(idx, 2)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: `1px solid ${CIRCUIT_COLOR}40`, borderRadius: Radius.full, padding: '3px 10px', cursor: 'pointer' }}>
                        <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: CIRCUIT_COLOR }}>+ BI-SERIE</span>
                      </button>
                      <button onClick={() => addSuperserie(idx, 3)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: `1px solid ${CIRCUIT_COLOR}40`, borderRadius: Radius.full, padding: '3px 10px', cursor: 'pointer' }}>
                        <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: CIRCUIT_COLOR }}>+ TRI-SERIE</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );

            const cardioCard = (ex: CircuitExercise, idx: number) => (
              <div key={ex.id} style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm, border: `1px solid ${Colors.teal}40` }}>
                <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: posColor(idx), letterSpacing: 0.5 }}>{posLabel(idx)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
                  <Timer color={Colors.teal} size={16} />
                  <span style={{ flex: 1, fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white }}>{ex.name}</span>
                  <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.teal }}>{ex.durationMinutes} min</span>
                  <button onClick={() => removeExercise(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                    <X color={Colors.gray} size={14} />
                  </button>
                </div>
              </div>
            );

            const items: React.ReactNode[] = [];
            let i = 0;
            while (i < exercises.length) {
              const ex = exercises[i];
              if (ex.supersetGroupId) {
                const idx = i;
                let runLen = 1;
                while (exercises[idx + runLen]?.supersetGroupId === ex.supersetGroupId) runLen++;
                const groupExs = exercises.slice(idx, idx + runLen);
                const label = groupExs.length >= 3 ? 'TRI-SERIE' : 'BI-SERIE';
                items.push(
                  <div key={ex.id} style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.md, border: `1px solid ${CIRCUIT_COLOR}50`, display: 'flex', flexDirection: 'column', gap: Spacing.sm, padding: Spacing.sm }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 10, color: CIRCUIT_COLOR, letterSpacing: 1 }}>{label}</span>
                      <button onClick={() => removeSuperserie(idx)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X color={Colors.gray} size={12} />
                        <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>quitar</span>
                      </button>
                    </div>
                    {groupExs.map((member, memberIdx) => (
                      <React.Fragment key={member.id}>
                        {memberIdx > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
                            <div style={{ width: 2, height: 18, backgroundColor: CIRCUIT_COLOR + '60', borderRadius: 1 }} />
                            <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: CIRCUIT_COLOR, letterSpacing: 0.5 }}>SEGUIDO DE</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: Spacing.sm, alignItems: 'center' }}>
                          <input
                            value={member.name}
                            onChange={(e) => updateExercise(idx + memberIdx, { name: e.target.value })}
                            placeholder="Nombre del ejercicio"
                            style={{ flex: 1, height: 40, backgroundColor: Colors.bgPage, borderRadius: Radius.sm, border: `1px solid ${Colors.bgPlaceholder}`, padding: '0 10px', fontFamily: Fonts.mono, fontSize: 13, color: Colors.white, outline: 'none' }}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <button onClick={() => updateExercise(idx + memberIdx, { reps: Math.max(1, member.reps - 1) })} style={{ width: 28, height: 28, backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, border: 'none', cursor: 'pointer', color: Colors.white, fontSize: 16 }}>−</button>
                            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, minWidth: 28, textAlign: 'center' }}>{member.reps}</span>
                            <button onClick={() => updateExercise(idx + memberIdx, { reps: member.reps + 1 })} style={{ width: 28, height: 28, backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, border: 'none', cursor: 'pointer', color: Colors.white, fontSize: 16 }}>+</button>
                          </div>
                          <button onClick={() => openGifModal(member.id, member.name || 'Ejercicio', member.gifUrl ?? '')} style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: member.gifUrl ? CIRCUIT_COLOR + '20' : Colors.bgElevated, border: `1px solid ${member.gifUrl ? CIRCUIT_COLOR + '60' : 'transparent'}`, borderRadius: Radius.md, padding: '4px 8px', cursor: 'pointer', flexShrink: 0 }}>
                            <Film color={member.gifUrl ? CIRCUIT_COLOR : Colors.gray} size={12} />
                          </button>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                );
                i += runLen;
              } else if (ex.type === 'cardio') {
                items.push(cardioCard(ex, i));
                i++;
              } else {
                items.push(exerciseCard(ex, i));
                i++;
              }
            }
            return items;
          })()}

          <div style={{ display: 'flex', gap: Spacing.sm }}>
            <button onClick={() => setExercises((prev) => [...prev, newExercise()])} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
              height: 44, backgroundColor: Colors.bgCard,
              borderRadius: Radius.md, border: `1px dashed ${CIRCUIT_COLOR}60`,
              cursor: 'pointer',
            }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = CIRCUIT_COLOR)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${CIRCUIT_COLOR}60`)}
            >
              <Plus color={CIRCUIT_COLOR} size={16} />
              <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: CIRCUIT_COLOR }}>EJERCICIO</span>
            </button>
            <button onClick={() => setShowCardioModal(true)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
              height: 44, backgroundColor: Colors.bgCard,
              borderRadius: Radius.md, border: `1px dashed ${Colors.teal}60`,
              cursor: 'pointer',
            }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = Colors.teal)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${Colors.teal}60`)}
            >
              <Timer color={Colors.teal} size={16} />
              <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.teal }}>CARDIO</span>
            </button>
          </div>
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
                  {e.name} {e.type === 'cardio' ? `${e.durationMinutes} min` : `×${e.reps}`}
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

      {/* Cardio modal */}
      {showCardioModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', zIndex: 1000 }}>
          <div style={{ width: '100%', backgroundColor: Colors.bgCard, borderRadius: '20px 20px 0 0', padding: `24px 20px calc(20px + env(safe-area-inset-bottom))`, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.bgPlaceholder, alignSelf: 'center', marginBottom: 4 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
              <Timer color={Colors.teal} size={20} />
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.white }}>AGREGAR CARDIO</span>
            </div>

            <div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5, marginBottom: 6 }}>ACTIVIDAD</div>
              <input
                value={cardioName}
                onChange={(e) => setCardioName(e.target.value)}
                placeholder="Caminadora, Bicicleta, Remo..."
                style={{ width: '100%', height: 48, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: `1px solid ${Colors.teal}60`, padding: '0 12px', fontFamily: Fonts.mono, fontSize: 16, color: Colors.white, outline: 'none', boxSizing: 'border-box' }}
                onFocus={(e) => (e.target.style.borderColor = Colors.teal)}
                onBlur={(e) => (e.target.style.borderColor = `${Colors.teal}60`)}
              />
            </div>

            <div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5, marginBottom: 8 }}>DURACIÓN (minutos)</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg }}>
                <button onClick={() => setCardioDuration((d) => Math.max(5, d - 5))} style={{ width: 48, height: 48, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: 'none', cursor: 'pointer', fontSize: 22, color: Colors.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 40, color: Colors.teal, minWidth: 80, textAlign: 'center' }}>{cardioDuration}</span>
                <button onClick={() => setCardioDuration((d) => d + 5)} style={{ width: 48, height: 48, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: 'none', cursor: 'pointer', fontSize: 22, color: Colors.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => { setShowCardioModal(false); setCardioName(''); setCardioDuration(20); }} style={{ flex: 1, height: 52, backgroundColor: Colors.bgElevated, borderRadius: Radius.lg, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.gray }}>
                CANCELAR
              </button>
              <button onClick={addCardio} disabled={!cardioName.trim()} style={{ flex: 2, height: 52, backgroundColor: cardioName.trim() ? Colors.teal : Colors.bgElevated, borderRadius: Radius.lg, border: 'none', cursor: cardioName.trim() ? 'pointer' : 'default', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: cardioName.trim() ? Colors.blackText : Colors.gray }}>
                AGREGAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GIF picker modal */}
      {gifModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', zIndex: 1000 }}>
          <div style={{
            width: '100%', backgroundColor: Colors.bgCard, borderRadius: '20px 20px 0 0',
            display: 'flex', flexDirection: 'column',
            height: '88vh', maxHeight: '88vh', overflow: 'hidden',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}>
            <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.bgPlaceholder, position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)' }} />
              <div style={{ marginTop: 6 }}>
                <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 17, color: Colors.white }}>SELECCIONAR GIF</div>
                <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: CIRCUIT_COLOR, marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>{gifModal.name}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                {gifModal.currentUrl && (
                  <button
                    onClick={() => { updateGifUrl(gifModal.exId, ''); setGifModal(null); }}
                    style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Quitar GIF
                  </button>
                )}
                <button onClick={() => setGifModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <X color={Colors.gray} size={20} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 20px 12px', flexShrink: 0, scrollbarWidth: 'none' }}>
              {(gifItems.length > 0 ? [...new Set(gifItems.map((g) => g.muscle))] : GIF_MUSCLES).map((m) => (
                <button
                  key={m}
                  onClick={() => setGifActiveTab(m)}
                  style={{
                    whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    backgroundColor: gifActiveTab === m ? CIRCUIT_COLOR : Colors.bgElevated,
                    fontFamily: Fonts.heading, fontWeight: 700, fontSize: 11,
                    color: gifActiveTab === m ? Colors.white : Colors.gray,
                    letterSpacing: 0.3, flexShrink: 0,
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '0 16px 16px', alignContent: 'start' }}>
                {gifLoading ? (
                  <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: 32 }}>
                    <Spinner color={CIRCUIT_COLOR} size={28} />
                  </div>
                ) : gifItems.filter((g) => g.muscle === gifActiveTab).map((gif) => {
                  const isSelected = gifModal.currentUrl === gif.url;
                  return (
                    <button
                      key={gif.id}
                      onClick={() => { updateGifUrl(gifModal.exId, gif.url); setGifModal(null); }}
                      style={{
                        aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: 'none', cursor: 'pointer', padding: 0,
                        outline: isSelected ? `3px solid ${CIRCUIT_COLOR}` : 'none',
                        outlineOffset: 2, position: 'relative',
                      }}
                    >
                      <img src={gif.url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      {isSelected && (
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: CIRCUIT_COLOR + '40', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: CIRCUIT_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: Colors.white, fontSize: 14, fontWeight: 700 }}>✓</span>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
