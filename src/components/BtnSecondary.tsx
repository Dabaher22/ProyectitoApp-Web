import React from 'react';
import { Colors, Fonts, Radius } from '../theme';

interface Props {
  label: string;
  onClick: () => void;
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

export default function BtnSecondary({ label, onClick, fullWidth, style }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 48,
        backgroundColor: 'transparent',
        borderRadius: Radius.lg,
        paddingLeft: 24,
        paddingRight: 24,
        border: `1px solid ${Colors.bgElevated}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: fullWidth ? '100%' : undefined,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = Colors.gray)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = Colors.bgElevated)}
    >
      <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.white, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </span>
    </button>
  );
}
