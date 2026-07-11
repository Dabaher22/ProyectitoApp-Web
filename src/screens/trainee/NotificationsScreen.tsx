import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, User, Settings, Plus } from 'lucide-react';
import ScreenHeader from '../../components/ScreenHeader';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { getNotificationsForUser, markAllRead, getLastReadAt, AppNotification } from '../../services/notifications';

type Tab = 'todo' | 'coach' | 'sistema';

function timeAgoNotif(ts: any): string {
  if (!ts) return '';
  const ms = ts?.toMillis?.() ?? 0;
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const { uid, role } = useAuthStore();
  const effectiveRole = (role === 'coach' ? 'trainee' : role) as 'coach' | 'trainee';
  const [tab, setTab] = useState<Tab>('todo');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [lastReadAt, setLastReadAt] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const load = async () => {
      try {
        const [notifs, readAt] = await Promise.all([
          getNotificationsForUser(uid, effectiveRole),
          getLastReadAt(uid),
        ]);
        setNotifications(notifs);
        setLastReadAt(readAt);
        markAllRead(uid);
      } catch {
        // show empty state on error
      } finally {
        setLoading(false);
      }
    };
    // Timeout fallback — never hang more than 5s
    const timeout = setTimeout(() => setLoading(false), 5000);
    load().then(() => clearTimeout(timeout));
    return () => clearTimeout(timeout);
  }, [uid]);

  const filtered = notifications.filter((n) => {
    if (tab === 'todo') return true;
    if (tab === 'coach') return n.type === 'coach';
    if (tab === 'sistema') return n.type === 'sistema';
    return true;
  });

  const isUnread = (n: AppNotification) => (n.createdAt?.toMillis?.() ?? 0) > lastReadAt;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'todo', label: 'TODO', icon: <Bell size={13} /> },
    { key: 'coach', label: 'COACH', icon: <User size={13} /> },
    { key: 'sistema', label: 'SISTEMA', icon: <Settings size={13} /> },
  ];

  return (
    <div className="screen-full" style={{ display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader
        title="NOTIFICACIONES"
        onBack={() => navigate(-1)}
        right={role === 'coach' ? (
          <button onClick={() => navigate('/coach/create-notification')} style={{
            backgroundColor: Colors.orange, borderRadius: Radius.md, height: 36, paddingLeft: 14, paddingRight: 14,
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: Spacing.xs,
          }}>
            <Plus size={16} color={Colors.blackText} />
            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.blackText }}>NUEVA</span>
          </button>
        ) : undefined}
      />

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${Colors.bgElevated}` }}>
        {tabs.map((t) => {
          const count = notifications.filter((n) => {
            const match = t.key === 'todo' ? true : t.key === 'coach' ? n.type === 'coach' : n.type === 'sistema';
            return match && isUnread(n);
          }).length;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, height: 46, background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11, letterSpacing: 0.5,
              color: tab === t.key ? Colors.orange : Colors.gray,
              borderBottom: `2px solid ${tab === t.key ? Colors.orange : 'transparent'}`,
              position: 'relative',
            }}>
              {t.icon}
              {t.label}
              {count > 0 && (
                <span style={{ backgroundColor: Colors.orange, borderRadius: 99, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 9, color: Colors.blackText, padding: '0 4px' }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <Spinner color={Colors.orange} size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, gap: Spacing.md }}>
            <Bell color={Colors.gray} size={40} />
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.white }}>Sin notificaciones</span>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>Aquí aparecerán los mensajes de tu coach y del sistema.</span>
          </div>
        ) : (
          filtered.map((n) => {
            const unread = isUnread(n);
            return (
              <div key={n.id} style={{
                backgroundColor: unread ? Colors.bgCard : Colors.bgPage,
                borderRadius: Radius.lg, padding: Spacing.md,
                display: 'flex', flexDirection: 'column', gap: Spacing.xs,
                borderLeft: `3px solid ${unread ? Colors.orange : Colors.bgElevated}`,
                opacity: unread ? 1 : 0.55,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {unread && (
                      <span style={{ backgroundColor: Colors.orange, borderRadius: 99, padding: '2px 7px', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 9, color: Colors.blackText, letterSpacing: 0.5 }}>NUEVO</span>
                    )}
                    <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 9, color: n.type === 'coach' ? Colors.teal : Colors.gray, letterSpacing: 0.5, textTransform: 'uppercase', border: `1px solid ${n.type === 'coach' ? Colors.teal + '50' : Colors.bgElevated}`, borderRadius: 99, padding: '2px 7px' }}>
                      {n.type}
                    </span>
                  </div>
                  <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, flexShrink: 0 }}>{timeAgoNotif(n.createdAt)}</span>
                </div>
                <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: unread ? Colors.white : Colors.gray }}>{n.title}</div>
                <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, lineHeight: 1.6 }}>{n.body}</div>
                <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, marginTop: 2 }}>De: {n.fromName}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
