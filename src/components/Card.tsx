import React from 'react';
import { Colors, Fonts, Radius, Spacing } from '../theme';

interface Props {
  icon: React.ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  badge?: React.ReactNode;
}

export default function Card({ icon, title, description, onClick, style, badge }: Props) {
  const inner = (
    <>
      <div style={{
        width: 44, height: 44, backgroundColor: Colors.bgElevated,
        borderRadius: Radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </span>
          {badge}
        </div>
        {description && (
          <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>{description}</span>
        )}
      </div>
    </>
  );

  const sharedStyle: React.CSSProperties = {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...style,
  };

  if (onClick) {
    return (
      <button
        onClick={onClick}
        style={{ ...sharedStyle, cursor: 'pointer', textAlign: 'left', width: '100%', border: 'none', transition: 'opacity 0.15s' }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        {inner}
      </button>
    );
  }
  return <div style={sharedStyle}>{inner}</div>;
}
