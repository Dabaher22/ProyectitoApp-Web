import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, LogOut } from 'lucide-react';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { signOut } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';

export default function PendingCoachScreen() {
  const navigate = useNavigate();
  const clear = useAuthStore((s) => s.clear);

  const handleSignOut = async () => {
    await signOut();
    clear();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bgPage, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Spacing.xl, textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Clock color={Colors.orange} size={40} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 26, color: Colors.white, letterSpacing: 2 }}>SOLICITUD ENVIADA</span>
          <span style={{ fontFamily: Fonts.mono, fontSize: 13, color: Colors.gray, lineHeight: 1.7 }}>
            Tu solicitud para ser coach está pendiente de aprobación.{'\n'}
            Te avisaremos cuando sea activada.
          </span>
        </div>
        <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, width: '100%' }}>
          <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, lineHeight: 1.6 }}>
            Mientras esperas, puedes usar la app como atleta. Vuelve a iniciar sesión una vez que tu cuenta sea aprobada.
          </span>
        </div>
        <button onClick={handleSignOut} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
          backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md,
          border: 'none', cursor: 'pointer', width: '100%',
        }}>
          <LogOut color={Colors.gray} size={18} />
          <span style={{ fontFamily: Fonts.mono, fontSize: 14, color: Colors.gray }}>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}
