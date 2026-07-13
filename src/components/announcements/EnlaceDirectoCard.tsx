import React from 'react';
import { X, Link2, Send, Users, ArrowRight } from 'lucide-react';
import { Colors, Fonts, Radius, Spacing } from '../../theme';

interface Props {
  onClose: () => void;
}

function FlowIcon({ icon, label, highlighted }: { icon: React.ReactNode; label: string; highlighted?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 56, height: 56, borderRadius: Radius.md,
        backgroundColor: highlighted ? Colors.teal : Colors.bgElevated,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: highlighted ? Colors.teal : Colors.gray, fontWeight: highlighted ? 700 : 400 }}>
        {label}
      </span>
    </div>
  );
}

export default function EnlaceDirectoCard({ onClose }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, boxSizing: 'border-box',
    }}>
      <div style={{
        width: '100%', maxWidth: 420, backgroundColor: Colors.bgCard, borderRadius: Radius.xl,
        padding: Spacing.lg, position: 'relative', boxSizing: 'border-box',
      }}>
        <button onClick={onClose} aria-label="Cerrar" style={{
          position: 'absolute', top: Spacing.lg, right: Spacing.lg, background: 'none', border: 'none',
          cursor: 'pointer', color: Colors.gray, padding: 0, display: 'flex',
        }}>
          <X size={22} />
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md, paddingRight: 36 }}>
          <div style={{
            width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.bgElevated,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Link2 color={Colors.teal} size={22} />
          </div>
          <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.white, lineHeight: 1.25, textTransform: 'uppercase' }}>
            Enlace directo<br />para tus asesorados
          </div>
        </div>

        <span style={{
          display: 'inline-block', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 10, color: Colors.teal,
          border: `1px solid ${Colors.teal}`, borderRadius: Radius.full, padding: '3px 12px', letterSpacing: 1, marginBottom: Spacing.md,
        }}>
          NUEVO
        </span>

        <div style={{ fontFamily: Fonts.mono, fontSize: 13, color: Colors.gray, lineHeight: 1.6, marginBottom: Spacing.lg }}>
          Un link, un toque, vinculado. Así de simple:
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.lg }}>
          <FlowIcon icon={<Link2 color={Colors.gray} size={22} />} label="tu link" />
          <ArrowRight color={Colors.gray} size={16} style={{ marginTop: 18, flexShrink: 0 }} />
          <FlowIcon icon={<Send color={Colors.gray} size={22} />} label="se lo mandás" />
          <ArrowRight color={Colors.gray} size={16} style={{ marginTop: 18, flexShrink: 0 }} />
          <FlowIcon icon={<Users color={Colors.blackText} size={22} />} label="vinculados" highlighted />
        </div>

        <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, lineHeight: 1.6, marginBottom: Spacing.lg }}>
          Revisá en <span style={{ color: Colors.white, fontWeight: 700 }}>Perfil → Invitar Asesorado</span> la nueva integración.
        </div>

        <button onClick={onClose} style={{
          width: '100%', height: 52, backgroundColor: Colors.orange, borderRadius: Radius.md,
          border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700,
          fontSize: 15, color: Colors.blackText, letterSpacing: 0.5,
        }}>
          ¡VAMOS!
        </button>
      </div>
    </div>
  );
}
