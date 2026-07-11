import React from 'react';
import { Colors, Fonts, Radius } from '../theme';

interface Props {
  label: string;
  variant?: 'active' | 'default';
}

export default function Badge({ label, variant = 'default' }: Props) {
  const isActive = variant === 'active';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 2,
        paddingBottom: 2,
        borderRadius: Radius.full,
        backgroundColor: isActive ? Colors.teal + '30' : Colors.bgElevated,
        border: `1px solid ${isActive ? Colors.teal : Colors.bgPlaceholder}`,
        fontFamily: Fonts.mono,
        fontWeight: 700,
        fontSize: 10,
        color: isActive ? Colors.teal : Colors.gray,
        letterSpacing: 0.5,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
