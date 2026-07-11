import React from 'react';
import { Colors, Fonts, Radius } from '../theme';
import Spinner from './Spinner';

interface Props {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

export default function BtnPrimary({ label, onClick, loading, disabled, fullWidth, style }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        height: 48,
        backgroundColor: Colors.orange,
        borderRadius: Radius.lg,
        paddingLeft: 24,
        paddingRight: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: fullWidth ? '100%' : undefined,
        opacity: disabled || loading ? 0.5 : 1,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'opacity 0.15s',
        flexShrink: 0,
        ...style,
      }}
    >
      {loading ? (
        <Spinner color={Colors.blackText} size={18} />
      ) : (
        <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: Colors.blackText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </span>
      )}
    </button>
  );
}
