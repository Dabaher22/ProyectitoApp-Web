import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle2, Clock, AlertTriangle, CreditCard, Send } from 'lucide-react';
import ScreenHeader from '../../components/ScreenHeader';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { getConnectionsByCoach, Connection } from '../../services/connections';
import { getMembershipsByCoach, getMembershipStatus, Membership, MembershipStatus } from '../../services/memberships';
import { useAuthStore } from '../../store/authStore';
import MembershipModal from './board/MembershipModal';

const RED = '#FF3B30';

type GroupKey = 'reportado' | 'vencido' | 'por_vencer' | 'al_dia' | 'sin_plan';

const GROUP_ORDER: GroupKey[] = ['reportado', 'vencido', 'por_vencer', 'al_dia', 'sin_plan'];

const GROUP_CONFIG: Record<GroupKey, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  reportado: { label: 'PAGO REPORTADO', color: Colors.orange, icon: Send },
  vencido: { label: 'VENCIDO', color: RED, icon: AlertTriangle },
  por_vencer: { label: 'POR VENCER', color: Colors.orange, icon: Clock },
  al_dia: { label: 'AL DÍA', color: Colors.teal, icon: CheckCircle2 },
  sin_plan: { label: 'SIN PLAN', color: Colors.gray, icon: CreditCard },
};

const STATUS_CONFIG: Record<MembershipStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  al_dia: { label: 'AL DÍA', color: Colors.teal, icon: CheckCircle2 },
  por_vencer: { label: 'POR VENCER', color: Colors.orange, icon: Clock },
  vencido: { label: 'VENCIDO', color: RED, icon: AlertTriangle },
};

function getGroup(m: Membership | undefined): GroupKey {
  if (!m) return 'sin_plan';
  if (m.pendingReport) return 'reportado';
  return getMembershipStatus(m.nextDueDate);
}

function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

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
  const [activeFilter, setActiveFilter] = useState<GroupKey | null>(null);

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

  const grouped = new Map<GroupKey, Connection[]>(GROUP_ORDER.map((g) => [g, []]));
  for (const c of connections) {
    const group = getGroup(memberships.get(c.traineeId));
    grouped.get(group)!.push(c);
  }

  const visibleGroups = activeFilter ? [activeFilter] : GROUP_ORDER;

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
          <>
            {/* Contadores tocables */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {GROUP_ORDER.filter((g) => grouped.get(g)!.length > 0).map((g) => {
                const cfg = GROUP_CONFIG[g];
                const count = grouped.get(g)!.length;
                const isActive = activeFilter === g;
                return (
                  <button
                    key={g}
                    onClick={() => setActiveFilter((prev) => (prev === g ? null : g))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                      backgroundColor: isActive ? cfg.color : cfg.color + '15',
                      border: `1px solid ${cfg.color}${isActive ? '' : '50'}`,
                      borderRadius: Radius.full, padding: '6px 12px',
                    }}
                  >
                    <span style={{
                      fontFamily: Fonts.mono, fontWeight: 700, fontSize: 10, letterSpacing: 0.5,
                      color: isActive ? Colors.blackText : cfg.color,
                    }}>
                      {cfg.label} · {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {visibleGroups.map((g) => {
              const items = grouped.get(g)!;
              if (items.length === 0) return null;
              const cfg = GROUP_CONFIG[g];
              return (
                <div key={g} style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
                  <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 12, color: cfg.color, letterSpacing: 1.5 }}>
                    {cfg.label} ({items.length})
                  </span>
                  {items.map((c) => {
                    const m = memberships.get(c.traineeId);
                    const status = m ? getMembershipStatus(m.nextDueDate) : null;
                    return (
                      <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div
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
                            {m && (
                              <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, marginTop: 2 }}>
                                Vence {formatDueDate(m.nextDueDate)}
                              </div>
                            )}
                          </div>
                          <MembershipButton status={status} onClick={() => setMembershipTarget({ id: c.traineeId, name: c.traineeName })} />
                        </div>
                        {g === 'sin_plan' && (
                          <button
                            onClick={() => setMembershipTarget({ id: c.traineeId, name: c.traineeName })}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              backgroundColor: 'transparent', border: `1px dashed ${Colors.gray}60`, borderRadius: Radius.md,
                              padding: '8px 12px', cursor: 'pointer',
                            }}
                          >
                            <CreditCard color={Colors.gray} size={13} />
                            <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>
                              Este asesorado no tiene seguimiento de pagos — configúralo
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
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
