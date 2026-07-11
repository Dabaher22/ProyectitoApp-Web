import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Clock, Check, FileText, Dumbbell, Pencil, X, ChevronDown, ChevronUp } from 'lucide-react';
import ScreenHeader from '../../components/ScreenHeader';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { WorkoutSession, ExerciseLog, formatSessionDate, formatDuration, updateSession } from '../../services/sessions';
import { useAuthStore } from '../../store/authStore';

function sessionAgeMs(startedAt: any): number {
  if (!startedAt) return Infinity;
  if (typeof startedAt.toMillis === 'function') return Date.now() - startedAt.toMillis();
  return Date.now() - new Date(startedAt).getTime();
}

export default function SessionDetailScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const uid = useAuthStore((s) => s.uid);
  const { session, traineeName } = (location.state as { session: WorkoutSession; traineeName?: string }) ?? {};

  const [editMode, setEditMode] = useState(false);
  const [editedExercises, setEditedExercises] = useState<ExerciseLog[]>(() =>
    session ? session.exercises.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s })) })) : []
  );
  const [expandedExId, setExpandedExId] = useState<string | null>(null);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>(
    session?.weightUnit ?? (localStorage.getItem('weight_unit') as 'kg' | 'lb') ?? 'kg'
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) navigate(-1);
  }, []);

  if (!session) return null;

  const isEditable = session.traineeId === uid && sessionAgeMs(session.startedAt) < 12 * 60 * 60 * 1000;

  const doneSets = session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const totalSets = session.exercises.reduce((a, e) => a + e.sets.length, 0);

  const toggleUnit = () => {
    setWeightUnit((u) => {
      const next = u === 'kg' ? 'lb' : 'kg';
      localStorage.setItem('weight_unit', next);
      return next;
    });
  };

  const updateSetField = (exId: string, setNum: number, field: 'reps' | 'weight', value: string) => {
    setEditedExercises((prev) =>
      prev.map((ex) =>
        ex.id === exId
          ? { ...ex, sets: ex.sets.map((s) => s.setNum === setNum ? { ...s, [field]: value } : s) }
          : ex
      )
    );
  };

  const updateExNotes = (exId: string, notes: string) => {
    setEditedExercises((prev) =>
      prev.map((ex) => ex.id === exId ? { ...ex, notes } : ex)
    );
  };

  const enterEditMode = () => {
    setEditedExercises(session.exercises.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s })) })));
    setExpandedExId(null);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setExpandedExId(null);
    setEditedExercises(session.exercises.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s })) })));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSession(session.id, editedExercises, weightUnit);
      // Reflect edits in the original session object so normal view shows updated data
      editedExercises.forEach((edited, i) => {
        if (session.exercises[i]) {
          session.exercises[i].sets = edited.sets;
          session.exercises[i].notes = edited.notes;
        }
      });
      setEditMode(false);
      setExpandedExId(null);
    } catch {
      alert('No se pudo guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const displayExercises = editMode ? editedExercises : session.exercises;

  return (
    <div>
      <ScreenHeader
        title={traineeName ? `SESIÓN DE ${traineeName.toUpperCase()}` : 'DETALLE DE SESIÓN'}
        onBack={() => {
          if (editMode) cancelEdit();
          else navigate(-1);
        }}
        right={
          isEditable && !editMode ? (
            <button onClick={enterEditMode} style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, padding: '6px 12px', border: 'none', cursor: 'pointer' }}>
              <Pencil color={Colors.orange} size={14} />
              <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11, color: Colors.orange }}>EDITAR</span>
            </button>
          ) : editMode ? (
            <button onClick={cancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X color={Colors.gray} size={20} />
            </button>
          ) : undefined
        }
      />

      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>

        {/* Session summary card */}
        <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>
                {formatSessionDate(session.startedAt)}
              </div>
              <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 17, color: Colors.white, textTransform: 'uppercase', marginTop: 2 }}>
                {session.routineName}
              </div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.teal, marginTop: 2 }}>
                {session.dayName}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, padding: '4px 10px' }}>
                <Clock color={Colors.orange} size={13} />
                <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.orange }}>
                  {formatDuration(session.durationSeconds)}
                </span>
              </div>
              <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>
                {doneSets}/{totalSets} series
              </span>
            </div>
          </div>
        </div>

        {/* Edit mode banner */}
        {editMode && (
          <div style={{ backgroundColor: Colors.orange + '15', borderRadius: Radius.md, padding: '10px 14px', borderLeft: `3px solid ${Colors.orange}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pencil color={Colors.orange} size={13} />
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.orange }}>Toca un ejercicio para editarlo</span>
          </div>
        )}

        {/* Exercises */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 12, color: Colors.gray, letterSpacing: 2 }}>
            EJERCICIOS
          </span>

          {displayExercises.map((ex) => {
            const completedSets = ex.sets.filter((s) => s.done);
            const isExpanded = editMode && expandedExId === ex.id;

            return (
              <div key={ex.id} style={{
                backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
                overflow: 'hidden',
                borderLeft: `3px solid ${completedSets.length > 0 ? (editMode ? Colors.orange : Colors.teal) : Colors.bgElevated}`,
              }}>
                {/* Exercise header — tappable in edit mode */}
                <button
                  onClick={() => editMode ? setExpandedExId(isExpanded ? null : ex.id) : undefined}
                  disabled={!editMode}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    cursor: editMode ? 'pointer' : 'default',
                    padding: Spacing.md, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
                    <Dumbbell color={completedSets.length > 0 ? (editMode ? Colors.orange : Colors.teal) : Colors.gray} size={15} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white, textTransform: 'uppercase' }}>
                        {ex.name}
                      </div>
                      {!isExpanded && completedSets.length > 0 && (
                        <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, marginTop: 2 }}>
                          {completedSets.map((s) => `${s.reps}×${s.weight}`).join('  ·  ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: completedSets.length > 0 ? (editMode ? Colors.orange : Colors.teal) : Colors.gray }}>
                      {completedSets.length}/{ex.sets.length}
                    </span>
                    {editMode && (
                      isExpanded
                        ? <ChevronUp color={Colors.orange} size={16} />
                        : <ChevronDown color={Colors.gray} size={16} />
                    )}
                  </div>
                </button>

                {/* Normal view: sets list */}
                {!editMode && (
                  <div style={{ padding: `0 ${Spacing.md}px ${Spacing.md}px`, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {completedSets.length > 0 ? (
                      completedSets.map((s) => (
                        <div key={s.setNum} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.teal + '25', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Check color={Colors.teal} size={11} />
                            </div>
                            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.gray }}>SERIE {s.setNum}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 14, color: Colors.white }}>
                              {s.reps} <span style={{ fontSize: 10, color: Colors.gray, fontWeight: 400 }}>reps</span>
                            </span>
                            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 14, color: Colors.orange }}>
                              {s.weight} <span style={{ fontSize: 10, color: Colors.gray, fontWeight: 400 }}>{session.weightUnit ?? 'kg'}</span>
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, paddingLeft: 4 }}>Sin series completadas</span>
                    )}
                    {ex.notes && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', backgroundColor: Colors.bgElevated, borderRadius: Radius.md, padding: '8px 12px', marginTop: 4 }}>
                        <FileText color={Colors.teal} size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, lineHeight: 1.5 }}>
                          <span style={{ color: Colors.teal }}>Nota: </span>{ex.notes}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Edit mode: expanded exercise editor */}
                {isExpanded && (
                  <div style={{ padding: `0 ${Spacing.md}px ${Spacing.md}px`, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Unit toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>Unidad:</span>
                      <button onClick={toggleUnit} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        backgroundColor: Colors.bgElevated, borderRadius: Radius.md,
                        padding: '4px 12px', border: `1px solid ${Colors.orange}40`, cursor: 'pointer',
                      }}>
                        <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.orange }}>{weightUnit.toUpperCase()}</span>
                        <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray }}>↕</span>
                      </button>
                    </div>

                    {/* Sets editor */}
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray, minWidth: 56 }}> </span>
                      <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                        <span style={{ flex: 1, fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray, textAlign: 'center', letterSpacing: 0.5 }}>REPS</span>
                        <span style={{ flex: 1, fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray, textAlign: 'center', letterSpacing: 0.5 }}>{weightUnit.toUpperCase()}</span>
                      </div>
                    </div>

                    {ex.sets.map((s) => (
                      <div key={s.setNum} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 56 }}>
                          <div style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: s.done ? Colors.teal + '25' : Colors.bgElevated, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {s.done ? <Check color={Colors.teal} size={10} /> : <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray }}>{s.setNum}</span>}
                          </div>
                          <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>S{s.setNum}</span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                          <input
                            value={s.reps}
                            onChange={(e) => updateSetField(ex.id, s.setNum, 'reps', e.target.value)}
                            type="number" inputMode="numeric"
                            style={{ flex: 1, height: 48, borderRadius: 10, backgroundColor: Colors.bgElevated, border: `1.5px solid ${Colors.teal}40`, textAlign: 'center', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 20, color: Colors.white, outline: 'none' }}
                          />
                          <input
                            value={s.weight}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || /^\d*\.?\d{0,1}$/.test(val)) updateSetField(ex.id, s.setNum, 'weight', val);
                            }}
                            type="text" inputMode="decimal"
                            style={{ flex: 1, height: 48, borderRadius: 10, backgroundColor: Colors.bgElevated, border: `1.5px solid ${Colors.orange}40`, textAlign: 'center', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 20, color: Colors.white, outline: 'none' }}
                          />
                        </div>
                      </div>
                    ))}

                    {/* Notes */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>COMENTARIOS</span>
                      <textarea
                        value={ex.notes ?? ''}
                        onChange={(e) => updateExNotes(ex.id, e.target.value)}
                        placeholder="Notas sobre este ejercicio..."
                        rows={2}
                        style={{
                          width: '100%', borderRadius: Radius.md, backgroundColor: Colors.bgElevated,
                          border: `1px solid ${ex.notes ? Colors.teal + '50' : Colors.bgElevated}`,
                          padding: '8px 12px', fontFamily: Fonts.mono, fontSize: 12, color: Colors.white,
                          resize: 'none', outline: 'none', lineHeight: 1.5,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Edit mode collapsed: show summary */}
                {editMode && !isExpanded && completedSets.length === 0 && (
                  <div style={{ padding: `0 ${Spacing.md}px ${Spacing.md}px` }}>
                    <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, paddingLeft: 4 }}>Sin series completadas</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Save button */}
        {editMode && (
          <button onClick={handleSave} disabled={saving} style={{
            height: 52, borderRadius: Radius.lg, backgroundColor: Colors.orange, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {saving ? <Spinner color={Colors.blackText} size={20} /> : null}
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.blackText, letterSpacing: 0.5 }}>
              {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
