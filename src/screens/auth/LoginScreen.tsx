import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import InputField from '../../components/InputField';
import BtnPrimary from '../../components/BtnPrimary';
import BtnSecondary from '../../components/BtnSecondary';
import { Colors, Fonts, Spacing, Radius } from '../../theme';
import { signIn, resetPassword, parseAuthError } from '../../services/auth';

export default function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Ingresa tu email y contraseña.'); return; }
    setLoading(true); setError('');
    try {
      await signIn(email.trim(), password);
      // onAuthStateChanged in App.tsx handles redirect
    } catch (err: any) {
      setError(parseAuthError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError('Ingresa tu email para restablecer la contraseña.'); return; }
    try {
      await resetPassword(email.trim());
      alert('Revisa tu bandeja de entrada para restablecer tu contraseña.');
    } catch (err: any) {
      setError(parseAuthError(err.code));
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bgPage, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: Spacing.xl }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Spacing.sm }}>
          <div style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.orange, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap color={Colors.blackText} size={32} fill={Colors.blackText} />
          </div>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 32, color: Colors.white, letterSpacing: 4 }}>PROYECTITO</span>
          <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, letterSpacing: 0.5 }}>Tu plataforma de entrenamiento</span>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.white, letterSpacing: 2 }}>INICIAR SESIÓN</span>

          {error && (
            <div style={{ backgroundColor: Colors.orange + '20', border: `1px solid ${Colors.orange}`, borderRadius: Radius.md, padding: Spacing.md }}>
              <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.orange }}>{error}</span>
            </div>
          )}

          <InputField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" type="email" autoComplete="email" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          <InputField label="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" autoComplete="current-password" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />

          <button onClick={handleForgotPassword} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right', padding: 0 }}>
            <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.orange }}>¿Olvidaste tu contraseña?</span>
          </button>

          <BtnPrimary label="Ingresar" onClick={handleLogin} loading={loading} fullWidth />

          <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
            <div style={{ flex: 1, height: 1, backgroundColor: Colors.bgElevated }} />
            <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>O</span>
            <div style={{ flex: 1, height: 1, backgroundColor: Colors.bgElevated }} />
          </div>

          <BtnSecondary label="Crear cuenta" onClick={() => navigate('/register')} fullWidth />
        </div>
      </div>
    </div>
  );
}
