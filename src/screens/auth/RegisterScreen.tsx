import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InputField from '../../components/InputField';
import BtnPrimary from '../../components/BtnPrimary';
import BtnSecondary from '../../components/BtnSecondary';
import { Colors, Fonts, Spacing, Radius } from '../../theme';
import { signUp, parseAuthError } from '../../services/auth';

export default function RegisterScreen() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = name.trim().length > 0 && email.trim().length > 0 && password.length >= 6 && password === confirm;

  const handleRegister = async () => {
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setLoading(true); setError('');
    try {
      await signUp(name.trim(), email.trim(), password);
    } catch (err: any) {
      setError(parseAuthError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bgPage, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
        <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4, color: Colors.gray }}>
          <span style={{ fontFamily: Fonts.mono, fontSize: 12 }}>← Volver</span>
        </button>

        <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 24, color: Colors.white, letterSpacing: 2 }}>CREAR CUENTA</span>
        <span style={{ fontFamily: Fonts.mono, fontSize: 13, color: Colors.gray, lineHeight: 1.5 }}>Únete a la plataforma de entrenamiento personalizado</span>

        {error && (
          <div style={{ backgroundColor: Colors.orange + '20', border: `1px solid ${Colors.orange}`, borderRadius: Radius.md, padding: Spacing.md }}>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.orange }}>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <InputField label="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Pérez" autoComplete="name" />
          <InputField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" type="email" autoComplete="email" />
          <InputField label="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" type="password" autoComplete="new-password" />
          <InputField label="Confirmar contraseña" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repite tu contraseña" type="password" autoComplete="new-password" onKeyDown={(e) => e.key === 'Enter' && handleRegister()} />

          <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>
            Al registrarte aceptas nuestros{' '}
            <span style={{ color: Colors.orange }}>Términos y Condiciones</span>
          </span>

          <BtnPrimary label="Crear cuenta" onClick={handleRegister} loading={loading} fullWidth disabled={!isValid} />
          <BtnSecondary label="Ya tengo cuenta" onClick={() => navigate('/login')} fullWidth />
        </div>
      </div>
    </div>
  );
}
