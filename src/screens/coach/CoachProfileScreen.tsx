import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, LogOut, Dumbbell, Copy, ShieldCheck, Users, Bell, BellOff } from 'lucide-react';
import ScreenHeader from '../../components/ScreenHeader';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { signOut } from '../../services/auth';
import { createInvite } from '../../services/connections';
import { requestPushPermission, getPushPermissionStatus } from '../../services/notifications';
import Spinner from '../../components/Spinner';

export default function CoachProfileScreen() {
  const navigate = useNavigate();
  const { uid, displayName, email, setTrainingMode, isAdmin } = useAuthStore();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [enablingPush, setEnablingPush] = useState(false);

  useEffect(() => {
    getPushPermissionStatus().then(setPushPermission);
  }, []);

  const handleEnablePush = async () => {
    if (!uid) return;
    setEnablingPush(true);
    const granted = await requestPushPermission(uid);
    setPushPermission(granted ? 'granted' : 'denied');
    setEnablingPush(false);
    if (!granted) alert('No se pudo activar. Verifica los permisos del navegador en Configuración.');
  };

  const handleGenerateCode = async () => {
    if (!uid || !displayName) return;
    setGeneratingCode(true);
    try {
      const code = await createInvite(uid, displayName);
      setInviteCode(code);
    } catch {
      alert('No se pudo generar el código. Intenta de nuevo.');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSwitchMode = () => {
    if (confirm('¿Cambiar a modo atleta para entrenarte tú mismo?')) {
      setTrainingMode(true);
    }
  };

  const handleSignOut = async () => {
    if (confirm('¿Seguro que quieres cerrar sesión?')) {
      await signOut();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div>
      <ScreenHeader title="MI PERFIL" />
      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
        {/* Profile Card */}
        <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, display: 'flex', alignItems: 'center', gap: Spacing.md }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 28, color: Colors.blackText }}>{displayName?.charAt(0).toUpperCase() ?? 'C'}</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.white }}>{displayName}</span>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>{email}</span>
            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 10, color: Colors.orange, border: `1px solid ${Colors.orange}`, borderRadius: Radius.full, padding: '3px 10px', alignSelf: 'flex-start', backgroundColor: Colors.orange + '30' }}>COACH</span>
          </div>
        </div>

        {/* Invite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>INVITAR ASESORADO</span>
          <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, lineHeight: 1.6 }}>
              Genera un código de 6 caracteres y compártelo con tu asesorado. El código es válido por 48 horas.
            </span>
            {inviteCode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
                <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 36, color: Colors.white, letterSpacing: 8, textAlign: 'center', backgroundColor: Colors.bgElevated, borderRadius: Radius.md, padding: Spacing.md }}>
                  {inviteCode}
                </div>
                <button onClick={handleCopyCode} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
                  backgroundColor: Colors.orange, borderRadius: Radius.md, height: 48, border: 'none', cursor: 'pointer',
                }}>
                  <Copy color={Colors.blackText} size={16} />
                  <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.blackText }}>{copied ? '¡COPIADO!' : 'COPIAR CÓDIGO'}</span>
                </button>
                <button onClick={handleGenerateCode} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
                  <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.orange }}>Generar otro código</span>
                </button>
              </div>
            ) : generatingCode ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}><Spinner color={Colors.orange} size={28} /></div>
            ) : (
              <button onClick={handleGenerateCode} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
                backgroundColor: Colors.orange, borderRadius: Radius.md, height: 48, border: 'none', cursor: 'pointer',
              }}>
                <Link2 color={Colors.blackText} size={18} />
                <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 14, color: Colors.blackText, letterSpacing: 1 }}>GENERAR CÓDIGO</span>
              </button>
            )}
          </div>
        </div>

        {/* Switch Mode */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>ENTRENAMIENTO PERSONAL</span>
          <button onClick={handleSwitchMode} style={{
            display: 'flex', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.md, border: 'none', cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ width: 44, height: 44, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Dumbbell color={Colors.teal} size={20} />
            </div>
            <div>
              <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white }}>Modo Atleta</div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>Entrénate tú mismo siguiendo tus propias rutinas</div>
            </div>
          </button>
        </div>

        {/* Admin */}
        {isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>ADMINISTRACIÓN</span>
            <button onClick={() => navigate('/admin/gifs')} style={{
              display: 'flex', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.md, border: `1px solid ${Colors.orange}30`, cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ width: 44, height: 44, backgroundColor: Colors.orange + '20', borderRadius: Radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldCheck color={Colors.orange} size={20} />
              </div>
              <div>
                <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white }}>Biblioteca de GIFs</div>
                <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>Gestionar, nombrar y agregar GIFs</div>
              </div>
            </button>
            <button onClick={() => navigate('/admin/coaches')} style={{
              display: 'flex', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.md, border: `1px solid ${Colors.orange}30`, cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ width: 44, height: 44, backgroundColor: Colors.orange + '20', borderRadius: Radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users color={Colors.orange} size={20} />
              </div>
              <div>
                <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white }}>Coaches Pendientes</div>
                <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>Aprobar solicitudes de coaches nuevos</div>
              </div>
            </button>
          </div>
        )}

        {/* Notificaciones push */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>NOTIFICACIONES</span>
          {pushPermission === 'granted' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, border: `1px solid ${Colors.teal}30` }}>
              <Bell color={Colors.teal} size={20} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.white }}>Notificaciones activas</div>
                <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>Recibirás alertas del sistema.</div>
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
    </div>
  );
}
