import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Eye, Send, Rocket, Trash2 } from 'lucide-react';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import ScreenHeader from '../../components/ScreenHeader';
import Spinner from '../../components/Spinner';
import { useAuthStore } from '../../store/authStore';
import { CARD_REGISTRY } from '../../components/announcements/registry';
import { getAdminUids } from '../../services/adminService';
import { createNotification, getNotificationByCardKey, publishAnnouncement, deleteNotification, AppNotification } from '../../services/notifications';

type Audience = 'all' | 'all_coaches' | 'all_trainees';

const AUDIENCE_LABEL: Record<Audience, string> = {
  all: 'Todos',
  all_coaches: 'Coaches',
  all_trainees: 'Asesorados',
};

export default function AdminAnnouncementsScreen() {
  const navigate = useNavigate();
  const { uid, displayName } = useAuthStore();
  const [statusByKey, setStatusByKey] = useState<Record<string, AppNotification | null>>({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const keys = Object.keys(CARD_REGISTRY);
    const results = await Promise.all(keys.map((k) => getNotificationByCardKey(k)));
    const next: Record<string, AppNotification | null> = {};
    keys.forEach((k, i) => { next[k] = results[i]; });
    setStatusByKey(next);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handlePublishToAdmins = async (key: string) => {
    if (!uid) return;
    setBusyKey(key);
    try {
      const adminUids = await getAdminUids();
      await createNotification({
        title: CARD_REGISTRY[key].label,
        body: 'Anuncio del sistema — disponible como card interactiva.',
        type: 'sistema',
        fromId: uid,
        fromName: displayName ?? 'Sistema',
        recipientIds: adminUids,
        toType: 'specific',
        presentation: 'card',
        cardKey: key,
      });
      await load();
    } finally {
      setBusyKey(null);
    }
  };

  const handleLaunch = async (key: string, audience: Audience) => {
    const notif = statusByKey[key];
    if (!notif) return;
    if (!confirm(`¿Lanzar "${CARD_REGISTRY[key].label}" a ${AUDIENCE_LABEL[audience].toLowerCase()}? Esta acción es visible de inmediato.`)) return;
    setBusyKey(key);
    try {
      await publishAnnouncement(notif.id, audience);
      await load();
    } finally {
      setBusyKey(null);
    }
  };

  const handleDelete = async (key: string) => {
    const notif = statusByKey[key];
    if (!notif) return;
    if (!confirm(`¿Eliminar el anuncio "${CARD_REGISTRY[key].label}"? Vuelve a quedar en borrador, sin publicar.`)) return;
    setBusyKey(key);
    try {
      await deleteNotification(notif.id);
      await load();
    } finally {
      setBusyKey(null);
    }
  };

  const PreviewComponent = previewKey ? CARD_REGISTRY[previewKey].component : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: Colors.bgPage, minHeight: '100vh' }}>
      <ScreenHeader title="ADMIN · ANUNCIOS DEL SISTEMA" onBack={() => navigate(-1)} />

      <div style={{ padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <Spinner color={Colors.orange} size={32} />
          </div>
        ) : (
          Object.entries(CARD_REGISTRY).map(([key, meta]) => {
            const notif = statusByKey[key];
            const liveAudience = notif && notif.toType !== 'specific' ? (notif.toType as Audience) : null;
            const phase = !notif ? 'draft' : liveAudience ? 'live' : 'admins';
            const busy = busyKey === key;
            return (
              <div key={key} style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.md }}>
                  <div style={{ width: 44, height: 44, backgroundColor: Colors.orange + '20', borderRadius: Radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Megaphone color={Colors.orange} size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white }}>{meta.label}</div>
                    <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>
                      {phase === 'draft' && 'No publicado'}
                      {phase === 'admins' && 'Publicado — solo Admins'}
                      {phase === 'live' && liveAudience && `Publicado — ${AUDIENCE_LABEL[liveAudience]}`}
                    </div>
                  </div>
                  <span style={{
                    fontFamily: Fonts.mono, fontWeight: 700, fontSize: 9, letterSpacing: 0.5, padding: '3px 8px', borderRadius: 99,
                    color: phase === 'live' ? Colors.teal : phase === 'admins' ? Colors.orange : Colors.gray,
                    border: `1px solid ${phase === 'live' ? Colors.teal : phase === 'admins' ? Colors.orange : Colors.bgElevated}50`,
                  }}>
                    {phase === 'live' ? 'LIVE' : phase === 'admins' ? 'PREVIEW' : 'DRAFT'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: Spacing.xs, flexWrap: 'wrap' }}>
                  <button onClick={() => setPreviewKey(key)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, backgroundColor: Colors.bgElevated, borderRadius: Radius.md,
                    padding: '8px 14px', border: 'none', cursor: 'pointer',
                  }}>
                    <Eye color={Colors.white} size={14} />
                    <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11, color: Colors.white }}>VISTA PREVIA</span>
                  </button>

                  {phase === 'draft' && (
                    <button onClick={() => handlePublishToAdmins(key)} disabled={busy} style={{
                      display: 'flex', alignItems: 'center', gap: 6, backgroundColor: Colors.orange, borderRadius: Radius.md,
                      padding: '8px 14px', border: 'none', cursor: 'pointer',
                    }}>
                      {busy ? <Spinner color={Colors.blackText} size={14} /> : <Send color={Colors.blackText} size={14} />}
                      <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11, color: Colors.blackText }}>PUBLICAR PARA ADMINS</span>
                    </button>
                  )}

                  {phase === 'admins' && (['all_coaches', 'all_trainees', 'all'] as Audience[]).map((audience) => (
                    <button key={audience} onClick={() => handleLaunch(key, audience)} disabled={busy} style={{
                      display: 'flex', alignItems: 'center', gap: 6, backgroundColor: Colors.teal, borderRadius: Radius.md,
                      padding: '8px 14px', border: 'none', cursor: 'pointer',
                    }}>
                      {busy ? <Spinner color={Colors.blackText} size={14} /> : <Rocket color={Colors.blackText} size={14} />}
                      <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11, color: Colors.blackText }}>LANZAR A {AUDIENCE_LABEL[audience].toUpperCase()}</span>
                    </button>
                  ))}

                  {/* Solo se puede eliminar mientras está en preview de Admins — una vez lanzada
                      a usuarios reales (fase "live"), no debe poder desaparecer aunque ya se haya visto. */}
                  {phase === 'admins' && (
                    <button onClick={() => handleDelete(key)} disabled={busy} style={{
                      display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'transparent', borderRadius: Radius.md,
                      padding: '8px 14px', border: `1px solid ${Colors.gray}50`, cursor: 'pointer',
                    }}>
                      {busy ? <Spinner color={Colors.gray} size={14} /> : <Trash2 color={Colors.gray} size={14} />}
                      <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11, color: Colors.gray }}>ELIMINAR</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {PreviewComponent && <PreviewComponent onClose={() => setPreviewKey(null)} />}
    </div>
  );
}
