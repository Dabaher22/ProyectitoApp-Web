import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Dumbbell } from 'lucide-react';
import { Colors, Fonts, Radius, Spacing } from '../theme';
import { saveUserRole } from '../services/auth';
import { useAuthStore } from '../store/authStore';
import Spinner from '../components/Spinner';

export default function RoleSelectionScreen() {
  const navigate = useNavigate();
  const uid = useAuthStore((s) => s.uid);
  const setRole = useAuthStore((s) => s.setRole);
  const [loading, setLoading] = useState<'coach' | 'trainee' | null>(null);
  const [error, setError] = useState('');

  const handleSelect = async (role: 'coach' | 'trainee') => {
    if (!uid) return;
    setLoading(role); setError('');
    try {
      if (role === 'coach') {
        await saveUserRole(uid, 'pending_coach');
        setRole('pending_coach');
        navigate('/pending-coach', { replace: true });
      } else {
        await saveUserRole(uid, 'trainee');
        setRole('trainee');
        navigate('/trainee', { replace: true });
      }
    } catch {
      setError('No se pudo guardar tu rol. Intenta de nuevo.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bgPage, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: Spacing.xl }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 28, color: Colors.white, letterSpacing: 3 }}>¿CUÁL ES TU ROL?</span>
          <span style={{ fontFamily: Fonts.mono, fontSize: 13, color: Colors.gray }}>Selecciona cómo quieres usar la plataforma</span>
        </div>

        {error && <div style={{ textAlign: 'center', fontFamily: Fonts.mono, fontSize: 12, color: Colors.orange }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          {/* Coach Card */}
          <button
            onClick={() => handleSelect('coach')}
            disabled={loading !== null}
            style={{
              backgroundColor: Colors.bgCard,
              borderRadius: Radius.lg,
              padding: Spacing.lg,
              display: 'flex',
              flexDirection: 'column',
              gap: Spacing.sm,
              border: `2px solid ${Colors.orange}40`,
              cursor: loading !== null ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              opacity: loading !== null && loading !== 'coach' ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            <div style={{ width: 60, height: 60, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {loading === 'coach' ? <Spinner color={Colors.orange} size={24} /> : <Users color={Colors.orange} size={36} />}
            </div>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 22, color: Colors.white, letterSpacing: 2 }}>COACH</span>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, lineHeight: 1.6 }}>Crea rutinas, gestiona tus asesorados y visualiza su progreso. Requiere aprobación.</span>
            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 10, color: Colors.orange, letterSpacing: 0.5, border: `1px solid ${Colors.orange}`, borderRadius: Radius.full, padding: '3px 10px', alignSelf: 'flex-start' }}>
              SOLICITAR ACCESO
            </span>
          </button>

          {/* Trainee Card */}
          <button
            onClick={() => handleSelect('trainee')}
            disabled={loading !== null}
            style={{
              backgroundColor: Colors.bgCard,
              borderRadius: Radius.lg,
              padding: Spacing.lg,
              display: 'flex',
              flexDirection: 'column',
              gap: Spacing.sm,
              border: `2px solid ${Colors.teal}40`,
              cursor: loading !== null ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              opacity: loading !== null && loading !== 'trainee' ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            <div style={{ width: 60, height: 60, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {loading === 'trainee' ? <Spinner color={Colors.teal} size={24} /> : <Dumbbell color={Colors.teal} size={36} />}
            </div>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 22, color: Colors.white, letterSpacing: 2 }}>ASESORADO</span>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, lineHeight: 1.6 }}>Accede a tus rutinas, registra entrenamientos y sigue tu progreso</span>
            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 10, color: Colors.blackText, letterSpacing: 0.5, backgroundColor: Colors.teal, borderRadius: Radius.full, padding: '3px 10px', alignSelf: 'flex-start' }}>
              ATLETA
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
