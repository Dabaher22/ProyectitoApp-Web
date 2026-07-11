import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Clock, Calendar, FileText, ChevronRight, PlayCircle, X } from 'lucide-react';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { getSessionsByTrainee, WorkoutSession, formatSessionDate, formatDuration } from '../../services/sessions';
import { useAuthStore } from '../../store/authStore';

export default function HistoryScreen() {
  const navigate = useNavigate();
  const uid = useAuthStore((s) => s.uid)!;
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Sesión en curso guardada en localStorage
  const [draft, setDraft] = useState<{ routineName: string; dayName: string; seconds: number } | null>(() => {
    try {
      const raw = localStorage.getItem(`workout_draft_${uid}`);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return d?.traineeId === uid ? { routineName: d.routineName, dayName: d.dayName, seconds: d.seconds } : null;
    } catch { return null; }
  });

  const discardDraft = () => {
    try { localStorage.removeItem(`workout_draft_${uid}`); } catch {}
    setDraft(null);
  };

  const load = useCallback(async () => {
    try { setSessions(await getSessionsByTrainee(uid)); }
    finally { setLoading(false); }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const totalDuration = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const totalSets = sessions.reduce((acc, s) => acc + s.exercises.reduce((a, e) => a + e.sets.filter((set) => set.done).length, 0), 0);

  return (
    <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
      <div>
        <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 22, color: Colors.white, letterSpacing: 1 }}>HISTORIAL</div>
        <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, marginTop: 2 }}>{sessions.length} sesiones</div>
      </div>

      {/* Sesión en curso */}
      {draft && (
        <div style={{ backgroundColor: Colors.orange + '15', border: `1px solid ${Colors.orange}50`, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', alignItems: 'center', gap: Spacing.md }}>
          <div style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.orange + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <PlayCircle color={Colors.orange} size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.orange, letterSpacing: 0.5 }}>SESIÓN EN CURSO</div>
            <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white, textTransform: 'uppercase', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{draft.routineName}</div>
            <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>{draft.dayName} · {formatDuration(draft.seconds)}</div>
          </div>
          <button
            onClick={() => navigate('/trainee/workout', { state: { resumeDraft: true } })}
            style={{ backgroundColor: Colors.orange, borderRadius: Radius.md, padding: '8px 14px', border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 12, color: Colors.blackText, letterSpacing: 0.5, flexShrink: 0 }}
          >
            CONTINUAR
          </button>
          <button onClick={discardDraft} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}>
            <X color={Colors.gray} size={16} />
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><Spinner color={Colors.teal} size={32} /></div>
      ) : (
        <>
          {sessions.length > 0 && (
            <div style={{ display: 'flex', backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md }}>
              {[
                { icon: <Calendar color={Colors.teal} size={16} />, val: String(sessions.length), label: 'SESIONES' },
                { icon: <Clock color={Colors.orange} size={16} />, val: formatDuration(totalDuration), label: 'TOTAL' },
                { icon: <Dumbbell color={Colors.white} size={16} />, val: String(totalSets), label: 'SERIES' },
              ].map((s) => (
                <div key={s.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {s.icon}
                  <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.white }}>{s.val}</span>
                  <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray, letterSpacing: 0.5 }}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {sessions.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: Spacing.md, textAlign: 'center' }}>
              <Dumbbell color={Colors.gray} size={48} />
              <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.white }}>Sin historial</div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, lineHeight: 1.6 }}>Completa tu primer entrenamiento para verlo aquí.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
              {sessions.map((item) => {
                const doneSets = item.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
                const totalSetCount = item.exercises.reduce((a, e) => a + e.sets.length, 0);
                return (
                  <div key={item.id} onClick={() => navigate('/trainee/session-detail', { state: { session: item } })} style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>{formatSessionDate(item.startedAt)}</div>
                        <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white, textTransform: 'uppercase', marginTop: 2 }}>{item.routineName}</div>
                        <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.teal }}>{item.dayName}</div>
                        {item.title && (
                          <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.orange, marginTop: 3 }}>"{item.title}"</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 14, color: Colors.orange }}>{formatDuration(item.durationSeconds)}</span>
                          <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>{doneSets}/{totalSetCount} series</span>
                        </div>
                        <ChevronRight color={Colors.gray} size={16} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: Spacing.xs }}>
                      {item.exercises.slice(0, 4).map((e) => (
                        <span key={e.id} style={{ backgroundColor: Colors.bgElevated, borderRadius: Radius.full, paddingLeft: 10, paddingRight: 10, paddingTop: 3, paddingBottom: 3, fontFamily: Fonts.mono, fontSize: 10, color: e.notes ? Colors.teal : Colors.gray, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {e.notes && <FileText size={9} color={Colors.teal} />}
                          {e.name.split(' ').slice(0, 2).join(' ')}
                        </span>
                      ))}
                      {item.exercises.length > 4 && (
                        <span style={{ backgroundColor: Colors.bgElevated, borderRadius: Radius.full, paddingLeft: 10, paddingRight: 10, paddingTop: 3, paddingBottom: 3, fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>
                          +{item.exercises.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
