import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle2, Clock, AlertTriangle, CreditCard } from 'lucide-react';
import ScreenHeader from '../../components/ScreenHeader';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { getConnectionsByCoach, getMembershipDays, Connection } from '../../services/connections';
import { getMembershipsByCoach, getMembershipStatus, Membership, MembershipStatus } from '../../services/memberships';
import { useAuthStore } from '../../store/authStore';
import MembershipModal from './board/MembershipModal';

const RED = '#FF3B30';

const STATUS_CONFIG: Record<MembershipStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  al_dia: { label: 'AL DÍA', color: Colors.teal, icon: CheckCircle2 },
  por_vencer: { label: 'POR VENCER', color: Colors.orange, icon: Clock },
  vencido: { label: 'VENCIDO', color: RED, icon: AlertTriangle },
};

function MembershipButton({ status, onClick }: { status: MembershipStatus | null; onClick: () => void }) {
  const cfg = status ? STATUS_CONFIG[status] : { label: 'SIN PLAN', color: Colors.gray, icon: CreditCard };
  const Icon = cfg.icon;
  const textColor = status === 'vencido' ? Colors.white : status ? Colors.blackText : Colors.gray;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        backgroundColor: status ? cfg.color : Colors.bgElevated,
        border: status ? 'none' : `1px solid ${Colors.bgPlaceholder}`,
        borderRadius: Radius.full, padding: '9px 14px', cursor: 'pointer',
        boxShadow: status ? `0 3px 10px ${cfg.color}60` : 'none',
      }}
    >
      <Icon color={textColor} size={14} />
      <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11, color: textColor, letterSpacing: 0.5 }}>{cfg.label}</span>
    </button>
  );
}

export default function ClientsScreen() {
  const navigate = useNavigate();
  const { uid } = useAuthStore();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [memberships, setMemberships] = useState<Map<string, Membership>>(new Map());
  const [loading, setLoading] = useState(true);
  const [membershipTarget, setMembershipTarget] = useState<{ id: string; name: string } | null>(null);

  const load = () => {
    if (!uid) return;
    Promise.all([getConnectionsByCoach(uid), getMembershipsByCoach(uid)])
      .then(([conns, membs]) => {
        setConnections(conns);
        setMemberships(new Map(membs.map((m) => [m.traineeId, m])));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [uid]);

  return (
    <div>
      <ScreenHeader title="MIS ASESORADOS" />
      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><Spinner color={Colors.orange} size={32} /></div>
        ) : connections.length === 0 ? (
          <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.xl, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Spacing.md }}>
            <Users color={Colors.gray} size={40} />
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.white }}>Sin asesorados</span>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>Genera un código de invitación desde tu perfil y compártelo con tus asesorados.</span>
          </div>
        ) : (
          connections.map((c) => {
            const m = memberships.get(c.traineeId);
            const status = m ? getMembershipStatus(m.nextDueDate) : null;
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/coach/board/${c.traineeId}`, { state: { traineeName: c.traineeName } })}
                style={{
                  backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
                  display: 'flex', alignItems: 'center', gap: Spacing.md, cursor: 'pointer',
                }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.blackText }}>{c.traineeName.charAt(0).toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 17, color: Colors.white, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.traineeName}</div>
                  <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, marginTop: 2 }}>{getMembershipDays(c.createdAt)} días de membresía</div>
                </div>
                <MembershipButton status={status} onClick={() => setMembershipTarget({ id: c.traineeId, name: c.traineeName })} />
              </div>
            );
          })
        )}
      </div>

      {membershipTarget && uid && (
        <MembershipModal
          coachId={uid}
          traineeId={membershipTarget.id}
          traineeName={membershipTarget.name}
          onClose={() => { setMembershipTarget(null); load(); }}
        />
      )}
    </div>
  );
}
