import React, { useEffect, useState } from 'react';
import { X, Check, Ban, Image as ImageIcon } from 'lucide-react';
import { Colors, Fonts, Radius, Spacing } from '../../../theme';
import Spinner from '../../../components/Spinner';
import MembershipBadge from '../../../components/MembershipBadge';
import {
  getMembership, setMembershipPlan, markPaymentReceived, confirmPaymentReport, rejectPaymentReport,
  getMembershipStatus, PLAN_LABELS, PLAN_DAYS, Membership, MembershipPlanType,
} from '../../../services/memberships';

const RED = '#FF3B30';
const PLAN_TYPES: MembershipPlanType[] = ['mensual', 'bimestral', 'trimestral', 'semestral', 'anual'];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface Props {
  coachId: string;
  traineeId: string;
  traineeName: string;
  onClose: () => void;
}

export default function MembershipModal({ coachId, traineeId, traineeName, onClose }: Props) {
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);

  const load = () => {
    getMembership(traineeId).then((m) => { setMembership(m); setLoading(false); });
  };
  useEffect(() => { load(); }, [traineeId]);

  const handlePickPlan = async (planType: MembershipPlanType) => {
    setSaving(true);
    try { await setMembershipPlan(coachId, traineeId, planType); load(); } finally { setSaving(false); }
  };

  const handleMarkPaid = async () => {
    if (!membership) return;
    const newDueDate = new Date(membership.nextDueDate);
    newDueDate.setDate(newDueDate.getDate() + PLAN_DAYS[membership.planType]);
    if (!confirm(`¿Marcar como pagado? La membresía quedará vigente hasta el ${formatDate(newDueDate.toISOString())}.`)) return;
    setSaving(true);
    try { await markPaymentReceived(traineeId); load(); } finally { setSaving(false); }
  };

  const handleConfirmReport = async () => {
    setSaving(true);
    try { await confirmPaymentReport(traineeId); load(); } finally { setSaving(false); }
  };

  const handleRejectReport = async () => {
    if (!confirm('¿Rechazar este comprobante?')) return;
    setSaving(true);
    try { await rejectPaymentReport(traineeId); load(); } finally { setSaving(false); }
  };

  const status = membership ? getMembershipStatus(membership.nextDueDate) : null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '85vh', overflowY: 'auto', backgroundColor: Colors.bgCard,
          borderRadius: '20px 20px 0 0', padding: `${Spacing.lg}px ${Spacing.lg}px calc(${Spacing.lg}px + env(safe-area-inset-bottom))`,
          display: 'flex', flexDirection: 'column', gap: Spacing.md,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, letterSpacing: 0.5 }}>MEMBRESÍA · {traineeName.toUpperCase()}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X color={Colors.gray} size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: Spacing.xl }}>
            <Spinner color={Colors.orange} size={28} />
          </div>
        ) : (
          <>
            {membership?.pendingReport && (
              <div style={{ backgroundColor: Colors.orange + '15', border: `1px solid ${Colors.orange}50`, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 12, color: Colors.orange, letterSpacing: 0.5 }}>PAGO REPORTADO — PENDIENTE</span>
                <button
                  onClick={() => setViewImage(membership.pendingReport!.imageUrl)}
                  style={{ border: 'none', padding: 0, cursor: 'pointer', borderRadius: Radius.md, overflow: 'hidden', width: 96, height: 96 }}
                >
                  <img src={membership.pendingReport.imageUrl} alt="Comprobante" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
                {membership.pendingReport.note && (
                  <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.white }}>{membership.pendingReport.note}</span>
                )}
                <div style={{ display: 'flex', gap: Spacing.sm }}>
                  <button onClick={handleConfirmReport} disabled={saving} style={{ flex: 1, height: 44, backgroundColor: Colors.teal, borderRadius: Radius.md, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Check color={Colors.blackText} size={16} />
                    <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.blackText }}>CONFIRMAR PAGO</span>
                  </button>
                  <button onClick={handleRejectReport} disabled={saving} style={{ flex: 1, height: 44, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: `1px solid ${RED}50`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Ban color={RED} size={16} />
                    <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: RED }}>RECHAZAR</span>
                  </button>
                </div>
              </div>
            )}

            <div>
              <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, letterSpacing: 0.5 }}>PLAN</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {PLAN_TYPES.map((p) => (
                  <button key={p} onClick={() => handlePickPlan(p)} disabled={saving} style={{
                    padding: '6px 12px', borderRadius: Radius.full, cursor: 'pointer',
                    backgroundColor: membership?.planType === p ? Colors.orange : Colors.bgElevated,
                    border: 'none', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11,
                    color: membership?.planType === p ? Colors.blackText : Colors.gray,
                  }}>
                    {PLAN_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {membership && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.bgElevated, borderRadius: Radius.md, padding: Spacing.md }}>
                <div>
                  <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>VENCE</div>
                  <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white, marginTop: 2 }}>
                    {formatDate(membership.nextDueDate)}
                  </div>
                </div>
                <MembershipBadge status={status} />
              </div>
            )}

            <button onClick={handleMarkPaid} disabled={saving || !membership} style={{
              height: 48, backgroundColor: Colors.teal, borderRadius: Radius.md, border: 'none',
              cursor: !membership ? 'default' : 'pointer', opacity: !membership ? 0.5 : 1,
              fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.blackText, letterSpacing: 0.5,
            }}>
              {saving ? 'GUARDANDO...' : 'MARCAR COMO PAGADO'}
            </button>

            {membership && membership.payments.length > 0 && (
              <div>
                <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, letterSpacing: 0.5 }}>HISTORIAL</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {[...membership.payments].reverse().map((p) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {p.imageUrl && (
                          <button onClick={() => setViewImage(p.imageUrl!)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                            <ImageIcon color={Colors.teal} size={14} />
                          </button>
                        )}
                        <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.white }}>{formatDate(p.date)}</span>
                      </div>
                      <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>
                        {PLAN_LABELS[p.planType]}{p.amount ? ` · ${p.amount}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {viewImage && (
        <div
          onClick={(e) => { e.stopPropagation(); setViewImage(null); }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24 }}
        >
          <img src={viewImage} alt="Comprobante" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: Radius.md }} />
        </div>
      )}
    </div>
  );
}
