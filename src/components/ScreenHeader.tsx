import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Colors, Fonts, Spacing } from '../theme';

interface Props {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export default function ScreenHeader({ title, onBack, right }: Props) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: `${Spacing.sm}px ${Spacing.lg}px`,
      gap: Spacing.sm,
      borderBottom: `1px solid ${Colors.bgElevated}`,
      backgroundColor: Colors.bgPage,
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: 'none', cursor: 'pointer', color: Colors.white, flexShrink: 0 }}
        >
          <ChevronLeft size={22} />
        </button>
      )}
      <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, letterSpacing: 1, textTransform: 'uppercase', flex: 1 }}>
        {title}
      </span>
      {right}
    </div>
  );
}
