import React, { useState, InputHTMLAttributes } from 'react';
import { Colors, Fonts, Radius, Spacing } from '../theme';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function InputField({ label, style, ...props }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
      <label style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {label}
      </label>
      <input
        style={{
          height: 48,
          backgroundColor: Colors.bgElevated,
          borderRadius: Radius.md,
          paddingLeft: Spacing.md,
          paddingRight: Spacing.md,
          fontFamily: Fonts.mono,
          fontSize: 13,
          color: Colors.white,
          border: `1px solid ${focused ? Colors.orange : 'transparent'}`,
          outline: 'none',
          transition: 'border-color 0.15s',
          width: '100%',
          ...(style as React.CSSProperties),
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </div>
  );
}
