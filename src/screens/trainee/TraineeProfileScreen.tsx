import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Link2, Users, Shield, UserX, Bell, BellOff, Receipt, Clock } from 'lucide-react';
import ScreenHeader from '../../components/ScreenHeader';
import Spinner from '../../components/Spinner';
import MembershipBadge from '../../components/MembershipBadge';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { signOut, saveUserRole } from '../../services/auth';
import { joinWithCode, getConnectionByTrainee, disconnectFromCoach, Connection } from '../../services/connections';
import { requestPushPermission, getPushPermissionStatus } from '../../services/notifications';
import { getMembership, getMembershipStatus, PLAN_LABELS, Membership } from '../../services/memberships';
import ReportPaymentModal from './ReportPaymentModal';

const RED = '#FF3B30';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TraineeProfileScreen() {
  const navigate = useNavigate();
  const { uid, displayName, email, role, trainingMode, setTrainingMode, setRole } = useAuthStore();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loadingConn, setLoadingConn] = useState(true);
  const [joinError, setJoinError] = useState('');
  const [disconnecting, setDisconnecting] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [enablingPush, setEnablingPush] = useState(false);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const loadMembership = () => {
    if (!uid) return;
    getMembership(uid).then(setMembership);
  };

  useEffect(() => {
    if (!uid) return;
    getConnectionByTrainee(uid).then(setConnection).finally(() => setLoadingConn(false));
    getPushPermissionStatus().then(setPushPermission);
    loadMembership();
  }, [uid]);

  const handleEnablePush = async () => {
    if (!uid) return;
    setEnablingPush(true);
    const granted = await requestPushPermission(uid);
    setPushPermission(granted ? 'granted' : 'denied');
    setEnablingPush(false);
    if (!granted) alert('No se pudo activar. Verifica los permisos del navegador en Configuración.');
  };

  const handleJoin = async () => {
    if (code.trim().length < 6) { setJoinError('Ingresa un código de 6 caracteres.'); return; }
    if (!uid || !displayName) return;
    setJoining(true); setJoinError('');
    try {
      const { coachName } = await joinWithCode(code.trim(), uid, displayName);
      alert(`¡Ahora estás conectado con ${coachName}!`);
      setCode('');
      const conn = await getConnectionByTrainee(uid);
      setConnection(conn);
    } catch (err: any) {
      setJoinError(err.message ?? 'No se pudo conectar.');
    } finally {
      setJoining(false);
    }
  };

  const handleRequestCoach = async () => {
    if (!uid) return;
    if (confirm('¿Solicitar acceso a modo Coach? Será activado manualmente.')) {
      await saveUserRole(uid, 'pending_coach');
      setRole('pending_coach');
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    if (!confirm(`¿Desvincular a ${connection.coachName} como tu coach? Perderás acceso a las rutinas asignadas.`)) return;
    setDisconnecting(true);
    try {
      await disconnectFromCoach(connection.id);
      setConnection(null);
    } catch {
      alert('No se pudo desvincular. Intenta de nuevo.');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSignOut = async () => {
    if (confirm('¿Seguro que quieres cerrar sesión?')) {
      await signOut();
      navigate('/login', { replace: true });
    }
  };

  const lastPayment = membership?.payments[membership.payments.length - 1];
  const lastRejected = membership?.rejectedReports?.[membership.rejectedReports.length - 1];
  const showRejectionNotice = !!lastRejected && (!lastPayment || new Date(lastRejected.rejectedAt) > new Date(lastPayment.date));

  return (
    <div>
      <ScreenHeader title="MI PERFIL" />
      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>

        {/* Profile Card */}
        <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, display: 'flex', alignItems: 'center', gap: Spacing.md }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: trainingMode ? Colors.orange : Colors.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 28, color: Colors.blackText }}>{displayName?.charAt(0).toUpperCase() ?? 'A'}</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.white }}>{displayName}</span>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>{email}</span>
            <span style={{
              fontFamily: Fonts.mono, fontWeight: 700, fontSize: 10,
              color: trainingMode ? Colors.orange : Colors.teal,
              border: `1px solid ${trainingMode ? Colors.orange : Colors.teal}`,
              borderRadius: Radius.full, padding: '3px 10px',
              backgroundColor: (trainingMode ? Colors.orange : Colors.teal) + '25',
              alignSelf: 'flex-start',
            }}>
              {trainingMode ? 'COACH (MODO ATLETA)' : 'ASESORADO'}
            </span>
          </div>
        </div>

        {/* Coach Connection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>MI COACH</span>
          {loadingConn ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}><Spinner color={Colors.teal} size={28} /></div>
          ) : connection ? (
            <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.md }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.blackText }}>{connection.coachName.charAt(0).toUpperCase()}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white }}>{connection.coachName}</div>
                  <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.teal, marginTop: 2 }}>Conectado · Coach activo</div>
                </div>
                {membership && <MembershipBadge status={getMembershipStatus(membership.nextDueDate)} />}
              </div>

              {membership?.pendingReport ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.xs, height: 40, backgroundColor: Colors.orange + '15', borderRadius: Radius.md, border: `1px solid ${Colors.orange}40`, justifyContent: 'center' }}>
                  <Clock color={Colors.orange} size={15} />
                  <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.orange }}>
                    PAGO REPORTADO — ESPERANDO CONFIRMACIÓN
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => setShowReportModal(true)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, height: 40, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: `1px solid ${Colors.teal}40`, cursor: 'pointer' }}
                >
                  <Receipt color={Colors.teal} size={15} />
                  <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.teal }}>REPORTAR PAGO</span>
                </button>
              )}

              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, height: 40, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: `1px solid #FF3B3030`, cursor: 'pointer' }}
              >
                <UserX color="#FF3B30" size={15} />
                <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: '#FF3B30' }}>
                  {disconnecting ? 'DESVINCULANDO…' : 'DESVINCULAR COACH'}
                </span>
              </button>
            </div>
          ) : (
            <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Spacing.md }}>
              <Users color={Colors.gray} size={24} />
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white }}>Conectar con un coach</span>
              <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, textAlign: 'center', lineHeight: 1.6 }}>Ingresa el código de invitación que te envió tu coach.</span>
              {joinError && <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.orange }}>{joinError}</span>}
              <div style={{ display: 'flex', gap: Spacing.sm, width: '100%', alignItems: 'center' }}>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO"
                  maxLength={6}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  style={{
                    flex: 1, height: 50, backgroundColor: Colors.bgElevated, borderRadius: Radius.md,
                    textAlign: 'center', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 22,
                    color: Colors.white, letterSpacing: 6, border: 'none', outline: 'none',
                  }}
                />
                {joining ? (
                  <Spinner color={Colors.orange} size={28} />
                ) : (
                  <button onClick={handleJoin} style={{
                    display: 'flex', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.orange,
                    borderRadius: Radius.md, paddingLeft: Spacing.md, paddingRight: Spacing.md, height: 50, border: 'none', cursor: 'pointer',
                  }}>
                    <Link2 color={Colors.blackText} size={18} />
                    <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.blackText }}>UNIRME</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mi membresía */}
        {connection && membership && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>MI MEMBRESÍA</span>
            <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>PLAN</div>
                  <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white, marginTop: 2 }}>{PLAN_LABELS[membership.planType]}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>VENCE</div>
                  <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white, marginTop: 2 }}>{formatDate(membership.nextDueDate)}</div>
                </div>
              </div>

              {showRejectionNotice && lastRejected && (
                <div style={{ backgroundColor: RED + '15', border: `1px solid ${RED}40`, borderRadius: Radius.md, padding: Spacing.sm }}>
                  <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: RED, lineHeight: 1.5 }}>
                    Tu último comprobante fue rechazado: {lastRejected.reason}. Volvé a reportar el pago.
                  </span>
                </div>
              )}

              {membership.payments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>HISTORIAL</span>
                  {[...membership.payments].reverse().map((p) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, padding: '8px 12px' }}>
                      <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.white }}>{formatDate(p.date)}</span>
                      <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>{PLAN_LABELS[p.planType]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Coach mode options */}
        {trainingMode ? (
          <button onClick={() => { if (confirm('¿Volver al panel de coach?')) setTrainingMode(false); }} style={{
            backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md,
            border: `1px solid ${Colors.orange}40`, cursor: 'pointer', textAlign: 'center',
          }}>
            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 14, color: Colors.orange }}>← Volver a modo Coach</span>
          </button>
        ) : role === 'pending_coach' ? (
          <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
            <Shield color={Colors.orange} size={18} />
            <span style={{ fontFamily: Fonts.mono, fontSize: 13, color: Colors.orange }}>Solicitud de coach pendiente de aprobación</span>
          </div>
        ) : role !== 'coach' ? (
          <button onClick={handleRequestCoach} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
            backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md,
            border: `1px solid ${Colors.orange}30`, cursor: 'pointer',
          }}>
            <Shield color={Colors.orange} size={18} />
            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.orange }}>Solicitar modo Coach</span>
          </button>
        ) : null}

        {/* Notificaciones push */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>NOTIFICACIONES</span>
          {pushPermission === 'granted' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, border: `1px solid ${Colors.teal}30` }}>
              <Bell color={Colors.teal} size={20} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.white }}>Notificaciones activas</div>
                <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>Recibirás alertas de tu coach y del sistema.</div>
              </div>
              <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.teal, border: `1px solid ${Colors.teal}40`, borderRadius: 99, padding: '3px 10px' }}>ACTIVO</span>
            </div>
          ) : pushPermission === 'denied' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md }}>
              <BellOff color={Colors.gray} size={20} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.white }}>Notificaciones bloqueadas</div>
                <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>Actívalas desde Configuración del navegador.</div>
              </div>
            </div>
          ) : (
            <button onClick={handleEnablePush} disabled={enablingPush} style={{
              display: 'flex', alignItems: 'center', gap: Spacing.md,
              backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md,
              border: `1px solid ${Colors.orange}30`, cursor: 'pointer', textAlign: 'left',
            }}>
              <Bell color={Colors.orange} size={20} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.orange }}>
                  {enablingPush ? 'Activando…' : 'Activar notificaciones push'}
                </div>
                <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>Recibe alertas aunque tengas la app cerrada.</div>
              </div>
            </button>
          )}
        </div>

        {/* Sign Out */}
        <button onClick={handleSignOut} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
          backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, border: 'none', cursor: 'pointer',
        }}>
          <LogOut color={Colors.gray} size={18} />
          <span style={{ fontFamily: Fonts.mono, fontSize: 14, color: Colors.gray }}>Cerrar sesión</span>
        </button>
      </div>

      {showReportModal && uid && connection && (
        <ReportPaymentModal
          traineeId={uid}
          coachId={connection.coachId}
          traineeName={displayName ?? undefined}
          onClose={() => setShowReportModal(false)}
          onSubmitted={() => { setShowReportModal(false); loadMembership(); }}
        />
      )}
    </div>
  );
}
