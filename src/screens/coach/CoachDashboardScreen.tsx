import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, Users, ClipboardList, Bell } from 'lucide-react';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { getConnectionsByCoach, Connection } from '../../services/connections';
import { getRoutinesByCoach, Routine } from '../../services/routines';
import { getUnreadCount } from '../../services/notifications';
import { useAuthStore } from '../../store/authStore';

export default function CoachDashboardScreen() {
  const navigate = useNavigate();
  const { uid, displayName } = useAuthStore();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const [conns, routs] = await Promise.all([getConnectionsByCoach(uid), getRoutinesByCoach(uid)]);
      setConnections(conns); setRoutines(routs);
      getUnreadCount(uid, 'coach').then(setUnreadCount);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
    } finally { setLoading(false); }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const quickBtns = [
    { label: 'Nueva\nRutina', icon: <Plus color={Colors.orange} size={22} />, onClick: () => navigate('/coach/create-routine') },
    { label: 'Mis\nAsesorados', icon: <Users color={Colors.teal} size={22} />, onClick: () => navigate('/coach/clients') },
    { label: 'Ver\nRutinas', icon: <TrendingUp color={Colors.white} size={22} />, onClick: () => navigate('/coach/routines') },
  ];

  return (
    <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 22, color: Colors.white, letterSpacing: 1 }}>
            HOLA, {(displayName ?? 'COACH').toUpperCase()} 👋
          </div>
          <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, marginTop: 2 }}>Panel de control</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
          <button onClick={() => navigate('/coach/notifications')} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <Bell color={unreadCount > 0 ? Colors.orange : Colors.gray} size={24} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 0, backgroundColor: Colors.orange, borderRadius: 99, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 9, color: Colors.blackText, padding: '0 3px' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <div style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.orange, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.blackText }}>{displayName?.charAt(0).toUpperCase() ?? 'C'}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><Spinner color={Colors.orange} size={32} /></div>
      ) : (
        <>
          {/* Quick Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>ACCIONES RÁPIDAS</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: Spacing.sm }}>
              {quickBtns.map((btn, i) => (
                <button key={i} onClick={btn.onClick} style={{
                  backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Spacing.sm,
                  border: 'none', cursor: 'pointer',
                }}>
                  <div style={{ width: 44, height: 44, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {btn.icon}
                  </div>
                  <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.white, textAlign: 'center', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{btn.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Trainees */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>MIS ASESORADOS</span>
              <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.orange }}>{connections.length} total</span>
            </div>
            {connections.length === 0 ? (
              <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, textAlign: 'center' }}>
                <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>Sin asesorados — genera un código desde tu perfil</span>
              </div>
            ) : (
              connections.slice(0, 3).map((c) => (
                <Card key={c.id} icon={<Users color={Colors.gray} size={20} />} title={c.traineeName} description="Asesorado activo"
                  badge={<Badge label="ACTIVO" variant="active" />}
                  onClick={() => navigate(`/coach/board/${c.traineeId}`, { state: { traineeName: c.traineeName } })}
                />
              ))
            )}
          </div>

          {/* Routines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>MIS RUTINAS</span>
              <button onClick={() => navigate('/coach/create-routine')} style={{
                height: 32, backgroundColor: Colors.orange, borderRadius: Radius.md, paddingLeft: 12, paddingRight: 12,
                border: 'none', cursor: 'pointer', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.blackText,
              }}>+ Nueva</button>
            </div>
            {routines.length === 0 ? (
              <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, textAlign: 'center' }}>
                <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>Sin rutinas — crea la primera</span>
              </div>
            ) : (
              routines.slice(0, 3).map((r) => (
                <Card key={r.id} icon={<ClipboardList color={Colors.orange} size={20} />} title={r.name}
                  description={`${r.type} · ${r.days.length} días · ${r.exercises.length} ejercicios`}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
