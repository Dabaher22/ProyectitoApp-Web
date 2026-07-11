import React from 'react';
import { Colors, Fonts, Radius } from '../theme';
import type { MembershipStatus } from '../services/memberships';

const RED = '#FF3B30';

const CONFIG: Record<MembershipStatus, { label: string; color: string }> = {
  al_dia: { label: 'AL DÍA', color: Colors.teal },
  por_vencer: { label: 'POR VENCER', color: Colors.orange },
  vencido: { label: 'VENCIDO', color: RED },
};

export default function MembershipBadge({ status }: { status: MembershipStatus | null }) {
  const cfg = status ? CONFIG[status] : { label: 'SIN PLAN', color: Colors.gray };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2,
      borderRadius: Radius.full,
      backgroundColor: cfg.color + '20',
      border: `1px solid ${cfg.color}60`,
      fontFamily: Fonts.mono, fontWeight: 700, fontSize: 9,
      color: cfg.color, letterSpacing: 0.5, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}
