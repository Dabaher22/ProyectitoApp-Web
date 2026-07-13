import React from 'react';
import { X, ChevronsRight, List } from 'lucide-react';
import { Colors, Fonts, Radius, Spacing } from '../../theme';

interface Props {
  onClose: () => void;
}

export default function SaltarEjerciciosCard({ onClose }: Props) {
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

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.lg, paddingRight: 36 }}>
          <div style={{
            width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.bgElevated,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <ChevronsRight color={Colors.orange} size={22} />
          </div>
          <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.white, lineHeight: 1.25, textTransform: 'uppercase' }}>
            Ahora podés<br />saltar ejercicios
          </div>
        </div>

        <div style={{ fontFamily: Fonts.mono, fontSize: 13, color: Colors.gray, lineHeight: 1.6, marginBottom: Spacing.lg }}>
          Durante tu entrenamiento podés reordenar los ejercicios cuando quieras:
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bgElevated,
          borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.orange,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.blackText }}>1</span>
          </div>
          <span style={{ flex: 1, fontFamily: Fonts.mono, fontSize: 12, color: Colors.white, lineHeight: 1.4 }}>
            Toca durante el entrenamiento
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${Colors.orange}`,
            borderRadius: Radius.full, padding: '6px 12px', flexShrink: 0,
          }}>
            <List size={13} color={Colors.orange} />
            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 10, color: Colors.orange }}>VER RUTINA</span>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bgElevated,
          borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg,
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.orange,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.blackText }}>2</span>
          </div>
          <span style={{ flex: 1, fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11, color: Colors.gray, textTransform: 'uppercase' }}>
            Extensión cuádriceps
          </span>
          <div style={{
            width: 32, height: 32, borderRadius: Radius.sm, border: `1px solid ${Colors.orange}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <ChevronsRight size={16} color={Colors.orange} />
          </div>
        </div>

        <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, lineHeight: 1.6, marginBottom: Spacing.lg }}>
          Elegís el ejercicio que quieras hacer y al terminarlo volvés al orden normal.
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
