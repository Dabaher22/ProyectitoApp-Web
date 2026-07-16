import React, { useEffect, useState } from 'react';
import { X, Check, Ban, Image as ImageIcon, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { Colors, Fonts, Radius, Spacing } from '../../../theme';
import Spinner from '../../../components/Spinner';
import MembershipBadge from '../../../components/MembershipBadge';
import {
  getMembership, setMembershipPlan, markPaymentReceived, confirmPaymentReport, rejectPaymentReport, undoLastPayment,
  getMembershipStatus, PLAN_LABELS, PLAN_DAYS, Membership, MembershipPlanType,
} from '../../../services/memberships';

const RED = '#FF3B30';
const PLAN_TYPES: MembershipPlanType[] = ['mensual', 'bimestral', 'trimestral', 'semestral', 'anual'];
const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Parses a <input type="date"> value to ISO, or null while it's empty/incomplete mid-edit. */
function toIsoOrNull(dateInputValue: string): string | null {
  const d = new Date(dateInputValue);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function computeDueDate(periodStartInputValue: string, days: number): string | null {
  const startIso = toIsoOrNull(periodStartInputValue);
  if (!startIso) return null;
  const d = new Date(startIso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
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

  // Setup (asesorado sin membresía todavía)
  const [setupDate, setSetupDate] = useState(todayInputValue());

  // Elegir desde cuándo corre el nuevo período (confirmar reporte / marcar pagado)
  const [showMarkPaidPicker, setShowMarkPaidPicker] = useState(false);
  const [showConfirmPicker, setShowConfirmPicker] = useState(false);
  const [periodStart, setPeriodStart] = useState(todayInputValue());

  // Rechazo con motivo
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [showRejectedHistory, setShowRejectedHistory] = useState(false);

  const load = () => {
    getMembership(traineeId).then((m) => { setMembership(m); setLoading(false); });
  };
  useEffect(() => { load(); }, [traineeId]);

  const closePickers = () => {
    setShowMarkPaidPicker(false);
    setShowConfirmPicker(false);
    setShowRejectForm(false);
    setRejectReason('');
  };

  const handlePickPlan = async (planType: MembershipPlanType) => {
    setSaving(true);
    try {
      if (!membership) {
        const startIso = toIsoOrNull(setupDate) ?? new Date().toISOString();
        await setMembershipPlan(coachId, traineeId, planType, startIso);
      } else {
        await setMembershipPlan(coachId, traineeId, planType);
      }
      load();
    } finally {
      setSaving(false);
    }
  };

  const openMarkPaidPicker = () => {
    setPeriodStart(todayInputValue());
    setShowMarkPaidPicker(true);
  };

  const handleMarkPaid = async () => {
    const startIso = toIsoOrNull(periodStart);
    if (!membership || !startIso) return;
    setSaving(true);
    try {
      await markPaymentReceived(traineeId, startIso);
      closePickers();
      load();
    } finally {
      setSaving(false);
    }
  };

  const openConfirmPicker = () => {
    setPeriodStart(todayInputValue());
    setShowConfirmPicker(true);
  };

  const handleConfirmReport = async () => {
    const startIso = toIsoOrNull(periodStart);
    if (!startIso) return;
    setSaving(true);
    try {
      await confirmPaymentReport(traineeId, startIso);
      closePickers();
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleRejectReport = async () => {
    if (!rejectReason.trim()) return;
    setSaving(true);
    try {
      await rejectPaymentReport(traineeId, rejectReason.trim());
      closePickers();
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleUndoLastPayment = async () => {
    if (!confirm('¿Deshacer el último pago registrado? Se borra ese registro y la membresía vuelve a la fecha de vencimiento anterior.')) return;
    setSaving(true);
    try {
      await undoLastPayment(traineeId);
      load();
    } finally {
      setSaving(false);
    }
  };

  const status = membership ? getMembershipStatus(membership.nextDueDate) : null;
  const rejectedReports = membership?.rejectedReports ?? [];
  const lastPayment = membership?.payments[membership.payments.length - 1];

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
                <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>
                  Reportado el {formatDate(membership.pendingReport.submittedAt)}
                </span>

                {showConfirmPicker ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, padding: Spacing.sm }}>
                    <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>INICIO DEL NUEVO PERÍODO</span>
                    <input
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      style={{ height: 40, borderRadius: Radius.sm, border: `1px solid ${Colors.bgPlaceholder}`, backgroundColor: Colors.bgPage, color: Colors.white, fontFamily: Fonts.mono, fontSize: 13, padding: '0 10px' }}
                    />
                    {membership && (() => {
                      const due = computeDueDate(periodStart, PLAN_DAYS[membership.planType]);
                      return due ? (
                        <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.teal }}>
                          La membresía quedará vigente hasta el {formatDate(due)}.
                        </span>
                      ) : (
                        <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>Elegí una fecha válida.</span>
                      );
                    })()}
                    <div style={{ display: 'flex', gap: Spacing.sm }}>
                      <button onClick={closePickers} disabled={saving} style={{ flex: 1, height: 40, backgroundColor: Colors.bgPage, borderRadius: Radius.md, border: 'none', cursor: 'pointer', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.gray }}>
                        CANCELAR
                      </button>
                      <button onClick={handleConfirmReport} disabled={saving || !toIsoOrNull(periodStart)} style={{ flex: 1, height: 40, backgroundColor: Colors.teal, borderRadius: Radius.md, border: 'none', cursor: 'pointer', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.blackText, opacity: toIsoOrNull(periodStart) ? 1 : 0.5 }}>
                        {saving ? 'GUARDANDO...' : 'CONFIRMAR'}
                      </button>
                    </div>
                  </div>
                ) : showRejectForm ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, padding: Spacing.sm }}>
                    <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>MOTIVO DEL RECHAZO</span>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Ej. No se ve el monto en la captura"
                      rows={2}
                      style={{ borderRadius: Radius.sm, border: `1px solid ${Colors.bgPlaceholder}`, backgroundColor: Colors.bgPage, color: Colors.white, fontFamily: Fonts.mono, fontSize: 12, padding: '8px 10px', resize: 'none', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: Spacing.sm }}>
                      <button onClick={closePickers} disabled={saving} style={{ flex: 1, height: 40, backgroundColor: Colors.bgPage, borderRadius: Radius.md, border: 'none', cursor: 'pointer', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.gray }}>
                        CANCELAR
                      </button>
                      <button onClick={handleRejectReport} disabled={saving || !rejectReason.trim()} style={{ flex: 1, height: 40, backgroundColor: RED, borderRadius: Radius.md, border: 'none', cursor: 'pointer', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.white, opacity: rejectReason.trim() ? 1 : 0.5 }}>
                        {saving ? 'ENVIANDO...' : 'RECHAZAR'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: Spacing.sm }}>
                    <button onClick={openConfirmPicker} disabled={saving} style={{ flex: 1, height: 44, backgroundColor: Colors.teal, borderRadius: Radius.md, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Check color={Colors.blackText} size={16} />
                      <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.blackText }}>CONFIRMAR PAGO</span>
                    </button>
                    <button onClick={() => setShowRejectForm(true)} disabled={saving} style={{ flex: 1, height: 44, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: `1px solid ${RED}50`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Ban color={RED} size={16} />
                      <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: RED }}>RECHAZAR</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <div>
              <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, letterSpacing: 0.5 }}>PLAN</span>
              {!membership && (
                <div style={{ marginTop: 6, marginBottom: 6 }}>
                  <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>FECHA DEL ÚLTIMO PAGO</span>
                  <input
                    type="date"
                    value={setupDate}
                    onChange={(e) => setSetupDate(e.target.value)}
                    style={{ display: 'block', marginTop: 4, height: 40, borderRadius: Radius.sm, border: `1px solid ${Colors.bgPlaceholder}`, backgroundColor: Colors.bgElevated, color: Colors.white, fontFamily: Fonts.mono, fontSize: 13, padding: '0 10px' }}
                  />
                  <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, marginTop: 4, display: 'block' }}>
                    Usa esta fecha si el asesorado ya lleva tiempo entrenando, para que el vencimiento quede correcto.
                  </span>
                </div>
              )}
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

            {showMarkPaidPicker ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, padding: Spacing.md }}>
                <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>INICIO DEL NUEVO PERÍODO</span>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  style={{ height: 40, borderRadius: Radius.sm, border: `1px solid ${Colors.bgPlaceholder}`, backgroundColor: Colors.bgPage, color: Colors.white, fontFamily: Fonts.mono, fontSize: 13, padding: '0 10px' }}
                />
                {membership && (() => {
                  const due = computeDueDate(periodStart, PLAN_DAYS[membership.planType]);
                  return due ? (
                    <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.teal }}>
                      La membresía quedará vigente hasta el {formatDate(due)}.
                    </span>
                  ) : (
                    <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>Elegí una fecha válida.</span>
                  );
                })()}
                <div style={{ display: 'flex', gap: Spacing.sm }}>
                  <button onClick={closePickers} disabled={saving} style={{ flex: 1, height: 44, backgroundColor: Colors.bgPage, borderRadius: Radius.md, border: 'none', cursor: 'pointer', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.gray }}>
                    CANCELAR
                  </button>
                  <button onClick={handleMarkPaid} disabled={saving || !toIsoOrNull(periodStart)} style={{ flex: 1, height: 44, backgroundColor: Colors.teal, borderRadius: Radius.md, border: 'none', cursor: 'pointer', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.blackText, opacity: toIsoOrNull(periodStart) ? 1 : 0.5 }}>
                    {saving ? 'GUARDANDO...' : 'CONFIRMAR'}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={openMarkPaidPicker} disabled={saving || !membership} style={{
                height: 48, backgroundColor: Colors.teal, borderRadius: Radius.md, border: 'none',
                cursor: !membership ? 'default' : 'pointer', opacity: !membership ? 0.5 : 1,
                fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.blackText, letterSpacing: 0.5,
              }}>
                MARCAR COMO PAGADO
              </button>
            )}

            {membership && membership.payments.length > 0 && (
              <div>
                <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, letterSpacing: 0.5 }}>HISTORIAL</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {[...membership.payments].reverse().map((p) => {
                    const isLast = p.id === lastPayment?.id;
                    const withinUndoWindow = Date.now() - new Date(p.date).getTime() < UNDO_WINDOW_MS;
                    const canUndo = isLast && !!p.previousDueDate && withinUndoWindow;
                    return (
                      <div key={p.id} style={{ backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {canUndo && (
                              <button onClick={handleUndoLastPayment} disabled={saving} title="Deshacer este pago" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                                <ArrowLeft color={Colors.orange} size={14} />
                              </button>
                            )}
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
                        {p.reportedAt && (
                          <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>Reportado el {formatDate(p.reportedAt)}</span>
                        )}
                        {p.note && (
                          <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, fontStyle: 'italic' }}>"{p.note}"</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {rejectedReports.length > 0 && (
              <div>
                <button
                  onClick={() => setShowRejectedHistory((v) => !v)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, letterSpacing: 0.5 }}>RECHAZOS ({rejectedReports.length})</span>
                  {showRejectedHistory ? <ChevronUp color={Colors.gray} size={14} /> : <ChevronDown color={Colors.gray} size={14} />}
                </button>
                {showRejectedHistory && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                    {[...rejectedReports].reverse().map((r) => (
                      <div key={r.id} style={{ backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4, opacity: 0.6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: RED }}>Rechazado el {formatDate(r.rejectedAt)}</span>
                          <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray }}>Reportado el {formatDate(r.submittedAt)}</span>
                        </div>
                        <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.white }}>Motivo: {r.reason}</span>
                        {r.note && <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, fontStyle: 'italic' }}>"{r.note}"</span>}
                      </div>
                    ))}
                  </div>
                )}
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
