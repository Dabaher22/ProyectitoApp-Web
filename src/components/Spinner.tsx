import React from 'react';
import { Colors } from '../theme';

interface Props {
  color?: string;
  size?: number;
}

export default function Spinner({ color = Colors.orange, size = 24 }: Props) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid transparent`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  );
}

// Inject keyframe once
if (typeof document !== 'undefined' && !document.getElementById('spin-style')) {
  const style = document.createElement('style');
  style.id = 'spin-style';
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}
