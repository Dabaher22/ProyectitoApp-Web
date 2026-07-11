import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send } from 'lucide-react';
import ScreenHeader from '../../components/ScreenHeader';
import BtnPrimary from '../../components/BtnPrimary';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { getConnectionsByCoach, Connection } from '../../services/connections';
import { createNotification } from '../../services/notifications';

export default function CreateNotificationScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { uid, displayName, isAdmin } = useAuthStore();
  const preselectedId = (location.state as any)?.traineeId ?? null;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    preselectedId ? new Set([preselectedId]) : new Set()
  );
  const [sendMode, setSendMode] = useState<'specific' | 'all_trainees' | 'all_coaches' | 'all'>(
    preselectedId ? 'specific' : 'all_trainees'
  );
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!uid) return;
    getConnectionsByCoach(uid).then((conns) => {
      setConnections(conns);
      setLoading(false);
    });
  }, [uid]);

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const canSend = title.trim() && body.trim() && (sendMode !== 'specific' || selectedIds.size > 0);

  const handleSend = async () => {
    if (!canSend || !uid) return;
    setSending(true);
    try {
      // Non-admin coaches sending to "all trainees" → resolve to their specific trainees only
      const isCoachAllTrainees = !isAdmin && sendMode === 'all_trainees';
      const resolvedType = isCoachAllTrainees ? 'specific' : sendMode;
      const resolvedIds = isCoachAllTrainees
        ? connections.map((c) => c.traineeId)
        : sendMode === 'specific' ? Array.from(selectedIds) : [];

      // Notifications type: sistema only for admin broadcasts; coach otherwise
      const notifType = isAdmin && (sendMode === 'all' || sendMode === 'all_coaches' || sendMode === 'all_trainees')
        ? 'sistema'
        : 'coach';

      await createNotification({
        title: title.trim(),
        body: body.trim(),
        type: notifType,
        fromId: uid,
        fromName: displayName ?? 'Coach',
        recipientIds: resolvedIds,
        toType: resolvedType,
      });
      alert('¡Notificación enviada!');
      navigate(-1);
    } catch {
      alert('No se pudo enviar. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const sendModeOptions: { key: typeof sendMode; label: string; desc: string }[] = [
    // Admin-only broadcast options
    ...(isAdmin ? [
      { key: 'all' as const, label: 'Todos', desc: 'Coaches y atletas' },
      { key: 'all_coaches' as const, label: 'Todos los coaches', desc: 'Solo coaches' },
      { key: 'all_trainees' as const, label: 'Todos los atletas', desc: 'Todos los atletas del sistema' },
    ] : [
      // Regular coaches only see their own scope
      { key: 'all_trainees' as const, label: 'Todos mis asesorados', desc: 'A todos tus asesorados activos' },
    ]),
    { key: 'specific' as const, label: 'Específicos', desc: 'Elige quién recibe la notificación' },
  ];

  return (
    <div className="screen-full" style={{ display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader title="NUEVA NOTIFICACIÓN" onBack={() => navigate(-1)} />

      <div style={{ flex: 1, overflowY: 'auto', padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>

        {/* Title */}
        <div>
          <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5, marginBottom: 6 }}>TÍTULO</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. ¡Nueva función disponible!"
            style={{ width: '100%', height: 48, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: `1px solid ${Colors.bgPlaceholder}`, padding: '0 14px', fontFamily: Fonts.mono, fontSize: 16, color: Colors.white, outline: 'none', boxSizing: 'border-box' }}
            onFocus={(e) => (e.target.style.borderColor = Colors.orange)}
            onBlur={(e) => (e.target.style.borderColor = Colors.bgPlaceholder)}
          />
        </div>

        {/* Body */}
        <div>
          <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5, marginBottom: 6 }}>MENSAJE</div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escribe el contenido de la notificación..."
            rows={4}
            style={{ width: '100%', backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: `1px solid ${Colors.bgPlaceholder}`, padding: '12px 14px', fontFamily: Fonts.mono, fontSize: 16, color: Colors.white, outline: 'none', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
            onFocus={(e) => (e.target.style.borderColor = Colors.orange)}
            onBlur={(e) => (e.target.style.borderColor = Colors.bgPlaceholder)}
          />
        </div>

        {/* Recipient mode */}
        <div>
          <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5, marginBottom: 8 }}>DESTINATARIOS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
            {sendModeOptions.map((opt) => (
              <button key={opt.key} onClick={() => setSendMode(opt.key)} style={{
                display: 'flex', alignItems: 'center', gap: Spacing.md,
                backgroundColor: sendMode === opt.key ? Colors.orange + '15' : Colors.bgCard,
                borderRadius: Radius.md, padding: Spacing.md,
                border: `1px solid ${sendMode === opt.key ? Colors.orange + '60' : Colors.bgElevated}`,
                cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${sendMode === opt.key ? Colors.orange : Colors.gray}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {sendMode === opt.key && <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.orange }} />}
                </div>
                <div>
                  <div style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.white }}>{opt.label}</div>
                  <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Trainee selector */}
        {sendMode === 'specific' && (
          <div>
            <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5, marginBottom: 8 }}>
              SELECCIONAR ASESORADOS ({selectedIds.size} seleccionados)
            </div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}><Spinner color={Colors.orange} size={24} /></div>
            ) : connections.length === 0 ? (
              <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, textAlign: 'center', padding: Spacing.md }}>Sin asesorados conectados.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
                {connections.map((c) => {
                  const isSelected = selectedIds.has(c.traineeId);
                  return (
                    <button key={c.traineeId} onClick={() => toggleId(c.traineeId)} style={{
                      display: 'flex', alignItems: 'center', gap: Spacing.md,
                      backgroundColor: isSelected ? Colors.orange + '15' : Colors.bgCard,
                      borderRadius: Radius.md, padding: Spacing.md,
                      border: `1px solid ${isSelected ? Colors.orange + '60' : Colors.bgElevated}`,
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.blackText }}>{c.traineeName.charAt(0).toUpperCase()}</span>
                      </div>
                      <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.white, flex: 1 }}>{c.traineeName}</span>
                      <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: isSelected ? Colors.orange : Colors.bgElevated, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isSelected && <span style={{ color: Colors.blackText, fontSize: 12, fontWeight: 700 }}>✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: Spacing.lg, backgroundColor: Colors.bgCard, borderTop: `1px solid ${Colors.bgElevated}` }}>
        {sending ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}><Spinner color={Colors.orange} size={32} /></div>
        ) : (
          <BtnPrimary label="ENVIAR NOTIFICACIÓN" onClick={handleSend} fullWidth disabled={!canSend} />
        )}
      </div>
    </div>
  );
}
