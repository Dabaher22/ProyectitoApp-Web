import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Calendar, Dumbbell, Flame } from 'lucide-react';
import ScreenHeader from '../../components/ScreenHeader';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { getSessionsByTrainee, WorkoutSession, formatDuration } from '../../services/sessions';

export default function FriendProfileScreen() {
  const navigate = useNavigate();
  const { friendId } = useParams<{ friendId: string }>();
  const location = useLocation();
  const friendName = (location.state as any)?.friendName ?? 'Amigo';
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (friendId) getSessionsByTrainee(friendId).then(setSessions).finally(() => setLoading(false));
  }, [friendId]);

  const totalExercises = sessions.reduce((acc, s) => acc + s.exercises.length, 0);
  const totalDuration = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);

  const stats = [
    { label: 'SESIONES', value: String(sessions.length), icon: <Calendar color={Colors.orange} size={18} /> },
    { label: 'EJERCICIOS', value: String(totalExercises), icon: <Dumbbell color={Colors.teal} size={18} /> },
    { label: 'TIEMPO', value: formatDuration(totalDuration), icon: <Flame color={Colors.orange} size={18} /> },
  ];

  return (
    <div>
      <ScreenHeader title="PERFIL" onBack={() => navigate(-1)} />
      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>

        {/* Profile card */}
        <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, display: 'flex', alignItems: 'center', gap: Spacing.md }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 24, color: Colors.blackText }}>{friendName.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.white, textTransform: 'uppercase' }}>{friendName}</div>
            <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.teal, marginTop: 2 }}>Amigo · Atleta</div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <Spinner color={Colors.teal} size={32} />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: Spacing.sm }}>
              {stats.map((s) => (
                <div key={s.label} style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {s.icon}
                  <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 22, color: Colors.white }}>{s.value}</span>
                  <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray, letterSpacing: 0.5 }}>{s.label}</span>
                </div>
              ))}
            </div>

          </>
        )}
      </div>
    </div>
  );
}
