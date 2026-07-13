import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Dumbbell, Users, Repeat, Zap, Bell } from 'lucide-react';
import BtnPrimary from '../../components/BtnPrimary';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { getRoutinesByTrainee, Routine } from '../../services/routines';
import { getUnreadCount } from '../../services/notifications';
import { getSessionsByTrainee, WorkoutSession, formatSessionDate, sessionToMs, timeAgo } from '../../services/sessions';
import { getFriendships, getFriendName, getFriendId } from '../../services/friends';
import { getCircuitsByTrainee, Circuit } from '../../services/circuits';
import { useAuthStore } from '../../store/authStore';
import AnnouncementOverlay from '../../components/announcements/AnnouncementOverlay';

function getRoutineDays(routine: Routine): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const e of routine.exercises) {
    const d = (e as any).day ?? routine.days[0] ?? 'Día 1';
    if (!seen.has(d)) { seen.add(d); result.push(d); }
  }
  return result.length > 0 ? result : routine.days;
}

interface FeedItem extends WorkoutSession {
  friendName: string;
  friendId: string;
}

export default function TraineeDashboardScreen() {
  const navigate = useNavigate();
  const { uid, displayName } = useAuthStore();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSession, setLastSession] = useState<WorkoutSession | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const [routs, mySessions, friendships, circs] = await Promise.all([
        getRoutinesByTrainee(uid),
        getSessionsByTrainee(uid),
        getFriendships(uid),
        getCircuitsByTrainee(uid),
      ]);
      setRoutines(routs);
      setCircuits(circs);
      getUnreadCount(uid, 'trainee').then(setUnreadCount);
      setLastSession(mySessions[0] ?? null);

      if (friendships.length > 0) {
        const friendSessionArrays = await Promise.all(
          friendships.map((f) => getSessionsByTrainee(getFriendId(f, uid)).catch(() => []))
        );
        const feed: FeedItem[] = friendships.flatMap((f, i) => {
          const name = getFriendName(f, uid);
          const fid = getFriendId(f, uid);
          return (friendSessionArrays[i] as WorkoutSession[])
            .filter((s) => sessionToMs(s.startedAt) > sevenDaysAgo)
            .map((s) => ({ ...s, friendName: name, friendId: fid }));
        });
        feed.sort((a, b) => sessionToMs(b.startedAt) - sessionToMs(a.startedAt));
        setFeedItems(feed);
      }
    } finally { setLoading(false); }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const openWorkout = (routine: Routine) => {
    navigate('/trainee/workout', {
      state: {
        routineId: routine.id,
        routineName: routine.name,
        allExercises: routine.exercises,
        days: getRoutineDays(routine),
      }
    });
  };

  return (
    <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
      <AnnouncementOverlay />
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 22, color: Colors.white, letterSpacing: 1 }}>
            HOLA, {(displayName ?? 'ATLETA').toUpperCase()} 💪
          </div>
          <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, marginTop: 2 }}>¿Listo para entrenar?</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
          <button onClick={() => navigate('/trainee/notifications')} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <Bell color={unreadCount > 0 ? Colors.orange : Colors.gray} size={24} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 0, backgroundColor: Colors.orange, borderRadius: 99, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 9, color: Colors.blackText, padding: '0 3px' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <div style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.blackText }}>
              {displayName?.charAt(0).toUpperCase() ?? 'A'}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
          <Spinner color={Colors.teal} size={32} />
        </div>
      ) : (
        <>
          {/* Routine */}
          {routines.length === 0 ? (
            <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg }}>
              <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.white }}>Sin rutina asignada</div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, marginTop: Spacing.xs }}>
                Tu coach aún no te ha asignado una rutina.
              </div>
            </div>
          ) : (
            routines.map((r) => {
              const days = getRoutineDays(r);
              const lastForRoutine = lastSession?.routineId === r.id ? lastSession : null;
              return (
                <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
                  <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>MI RUTINA</span>
                  <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
                    <div>
                      <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.white, textTransform: 'uppercase' }}>{r.name}</span>
                      <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 4 }}>
                        {days.length} días/semana · {r.exercises.length} ejercicios
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: Spacing.xs, flexWrap: 'wrap' }}>
                      {days.map((d) => (
                        <span key={d} style={{
                          backgroundColor: Colors.teal + '15', border: `1px solid ${Colors.teal}30`,
                          borderRadius: Radius.sm, padding: '3px 10px',
                          fontFamily: Fonts.mono, fontWeight: 700, fontSize: 10, color: Colors.teal,
                        }}>{d.toUpperCase()}</span>
                      ))}
                    </div>
                    {lastForRoutine ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, padding: `${Spacing.xs}px ${Spacing.sm}px` }}>
                        <Clock color={Colors.gray} size={12} />
                        <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>
                          Última sesión: <span style={{ color: Colors.white }}>{lastForRoutine.dayName}</span>{' · '}{formatSessionDate(lastForRoutine.startedAt)}
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, padding: `${Spacing.xs}px ${Spacing.sm}px` }}>
                        <Clock color={Colors.gray} size={12} />
                        <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>Sin sesiones previas · ¡Empieza hoy!</span>
                      </div>
                    )}
                    <BtnPrimary label="INICIAR ENTRENAMIENTO →" onClick={() => openWorkout(r)} fullWidth />
                    <button
                      onClick={() => navigate('/trainee/friends')}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
                        height: 44, backgroundColor: 'transparent', borderRadius: Radius.md,
                        border: `1px solid ${Colors.teal}30`, cursor: 'pointer',
                      }}
                    >
                      <Users color={Colors.teal} size={15} />
                      <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.teal }}>AMIGOS</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Circuitos asignados */}
          {circuits.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>MIS CIRCUITOS</span>
              {circuits.map((c) => {
                const minutes = c.format === 'amrap' ? c.timeLimitMinutes : c.totalMinutes;
                const CircIcon = c.format === 'amrap' ? Repeat : Zap;
                const CIRCUIT_COLOR = '#B980FF';
                return (
                  <div key={c.id} style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
                      <div style={{ width: 36, height: 36, borderRadius: Radius.md, backgroundColor: CIRCUIT_COLOR + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CircIcon color={CIRCUIT_COLOR} size={18} />
                      </div>
                      <div>
                        <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, textTransform: 'uppercase' }}>{c.name}</span>
                        <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>
                          {c.format.toUpperCase()} · {minutes} min · {c.exercises.length} ejercicios
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: Spacing.xs, flexWrap: 'wrap' }}>
                      {c.exercises.slice(0, 3).map((e) => (
                        <span key={e.id} style={{ backgroundColor: CIRCUIT_COLOR + '15', border: `1px solid ${CIRCUIT_COLOR}30`, borderRadius: Radius.sm, padding: '2px 8px', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 10, color: CIRCUIT_COLOR }}>
                          {e.name} ×{e.reps}
                        </span>
                      ))}
                      {c.exercises.length > 3 && <span style={{ backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, padding: '2px 8px', fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>+{c.exercises.length - 3}</span>}
                    </div>
                    <button
                      onClick={() => navigate('/trainee/circuit', { state: c })}
                      style={{ height: 48, backgroundColor: CIRCUIT_COLOR, borderRadius: Radius.md, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white, letterSpacing: 0.5 }}
                    >
                      INICIAR {c.format.toUpperCase()} →
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Friends feed — últimos 7 días */}
          {feedItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>ACTIVIDAD DE AMIGOS</span>
              {feedItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate('/trainee/session-detail', { state: { session: item, traineeName: item.friendName } })}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
                    padding: '16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                    borderLeft: `3px solid ${Colors.teal}40`, width: '100%',
                  }}
                >
                  {/* Avatar */}
                  <div style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.teal + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.teal }}>{item.friendName.charAt(0).toUpperCase()}</span>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.teal, textTransform: 'uppercase' }}>{item.friendName}</span>
                        <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>entrenó</span>
                      </div>
                      <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, flexShrink: 0 }}>{timeAgo(item.startedAt)}</span>
                    </div>
                    <div style={{ fontFamily: Fonts.mono, fontSize: 13, color: Colors.white, lineHeight: 1.4 }}>
                      {item.routineName}
                    </div>
                    {item.title && (
                      <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.orange, lineHeight: 1.4 }}>
                        "{item.title}"
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>{item.dayName}</span>
                      <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>·</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Dumbbell color={Colors.gray} size={10} />
                        <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>{item.exercises.length} ejercicios</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
