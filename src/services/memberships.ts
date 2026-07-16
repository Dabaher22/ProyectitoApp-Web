import {
  doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { createNotification } from './notifications';

export type MembershipPlanType = 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';

export const PLAN_LABELS: Record<MembershipPlanType, string> = {
  mensual: 'Mensual',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral (6 meses)',
  anual: 'Anual',
};

export const PLAN_DAYS: Record<MembershipPlanType, number> = {
  mensual: 30,
  bimestral: 60,
  trimestral: 90,
  semestral: 180,
  anual: 365,
};

export interface MembershipPayment {
  id: string;
  date: string;
  planType: MembershipPlanType;
  amount?: number;
  imageUrl?: string;
  /** Nota que escribió el asesorado al reportar el pago (si vino de un reporte). */
  note?: string;
  /** Fecha ISO en que el asesorado reportó el pago (si vino de un reporte). `date` es la fecha de confirmación. */
  reportedAt?: string;
  /** nextDueDate de la membresía justo antes de este pago — permite deshacerlo. Ausente en pagos viejos (no se pueden deshacer). */
  previousDueDate?: string;
}

export interface PendingPaymentReport {
  id: string;
  imageUrl: string;
  note?: string;
  submittedAt: string;
}

export interface RejectedReport {
  id: string;
  imageUrl: string;
  note?: string;
  submittedAt: string;
  rejectedAt: string;
  reason: string;
}

export interface Membership {
  id: string;
  coachId: string;
  traineeId: string;
  planType: MembershipPlanType;
  nextDueDate: string;
  payments: MembershipPayment[];
  pendingReport: PendingPaymentReport | null;
  rejectedReports?: RejectedReport[];
  createdAt: any;
  updatedAt: any;
}

export type MembershipStatus = 'al_dia' | 'por_vencer' | 'vencido';

const DUE_SOON_DAYS = 5;

export function getMembershipStatus(nextDueDate: string): MembershipStatus {
  const daysLeft = Math.ceil((new Date(nextDueDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (daysLeft < 0) return 'vencido';
  if (daysLeft <= DUE_SOON_DAYS) return 'por_vencer';
  return 'al_dia';
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function getMembership(traineeId: string): Promise<Membership | null> {
  const snap = await getDoc(doc(db, 'memberships', traineeId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Membership;
}

export async function getMembershipsByCoach(coachId: string): Promise<Membership[]> {
  const q = query(collection(db, 'memberships'), where('coachId', '==', coachId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Membership));
}

export async function setMembershipPlan(
  coachId: string,
  traineeId: string,
  planType: MembershipPlanType,
  startDate?: string
): Promise<void> {
  const existing = await getMembership(traineeId);
  if (!existing) {
    const start = startDate ?? new Date().toISOString();
    const data = {
      coachId,
      traineeId,
      planType,
      nextDueDate: addDays(start, PLAN_DAYS[planType]),
      payments: [] as MembershipPayment[],
      pendingReport: null as PendingPaymentReport | null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'memberships', traineeId), data);
    return;
  }
  await updateDoc(doc(db, 'memberships', traineeId), { planType, updatedAt: serverTimestamp() });
}

export async function markPaymentReceived(traineeId: string, periodStart: string, amount?: number): Promise<void> {
  const membership = await getMembership(traineeId);
  if (!membership) return;
  const newDueDate = addDays(periodStart, PLAN_DAYS[membership.planType]);
  const payment: MembershipPayment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    date: new Date().toISOString(),
    planType: membership.planType,
    previousDueDate: membership.nextDueDate,
    ...(amount !== undefined ? { amount } : {}),
  };
  await updateDoc(doc(db, 'memberships', traineeId), {
    nextDueDate: newDueDate,
    payments: [...membership.payments, payment],
    updatedAt: serverTimestamp(),
  });
}

/** Revierte el pago más reciente (por si se marcó por error): borra el registro y
 * restaura la fecha de vencimiento anterior. Solo funciona sobre el último pago. */
export async function undoLastPayment(traineeId: string): Promise<void> {
  const membership = await getMembership(traineeId);
  if (!membership || membership.payments.length === 0) return;
  const last = membership.payments[membership.payments.length - 1];
  if (!last.previousDueDate) return;
  await updateDoc(doc(db, 'memberships', traineeId), {
    nextDueDate: last.previousDueDate,
    payments: membership.payments.slice(0, -1),
    updatedAt: serverTimestamp(),
  });
}

export async function uploadPaymentProof(traineeId: string, file: File): Promise<string> {
  const path = `payment-proofs/${traineeId}/${Date.now()}_${file.name}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

export async function submitPaymentReport(
  traineeId: string,
  coachId: string,
  imageUrl: string,
  note?: string,
  traineeName?: string
): Promise<void> {
  const existing = await getMembership(traineeId);
  const report: PendingPaymentReport = {
    id: `rep_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    imageUrl,
    submittedAt: new Date().toISOString(),
    ...(note ? { note } : {}),
  };

  if (!existing) {
    // Con el flujo nuevo la membresía se crea al conectar (ver connections.ts::joinWithCode),
    // así que esto solo debería pasar para conexiones hechas antes de ese cambio.
    await setMembershipPlan(coachId, traineeId, 'mensual');
  }
  await updateDoc(doc(db, 'memberships', traineeId), {
    pendingReport: report,
    updatedAt: serverTimestamp(),
  });

  const name = traineeName ?? 'Un asesorado';
  await createNotification({
    title: 'Pago reportado',
    body: `${name} reportó un pago y espera tu confirmación.`,
    type: 'coach',
    fromId: traineeId,
    fromName: name,
    recipientIds: [coachId],
    toType: 'specific',
  });
}

export async function confirmPaymentReport(traineeId: string, periodStart: string): Promise<void> {
  const membership = await getMembership(traineeId);
  if (!membership?.pendingReport) return;
  const newDueDate = addDays(periodStart, PLAN_DAYS[membership.planType]);
  const payment: MembershipPayment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    date: new Date().toISOString(),
    planType: membership.planType,
    imageUrl: membership.pendingReport.imageUrl,
    previousDueDate: membership.nextDueDate,
    ...(membership.pendingReport.note ? { note: membership.pendingReport.note } : {}),
    reportedAt: membership.pendingReport.submittedAt,
  };
  await updateDoc(doc(db, 'memberships', traineeId), {
    nextDueDate: newDueDate,
    payments: [...membership.payments, payment],
    pendingReport: null,
    updatedAt: serverTimestamp(),
  });
}

export async function rejectPaymentReport(traineeId: string, reason: string): Promise<void> {
  const membership = await getMembership(traineeId);
  if (!membership?.pendingReport) return;
  const rejected: RejectedReport = {
    ...membership.pendingReport,
    rejectedAt: new Date().toISOString(),
    reason,
  };
  await updateDoc(doc(db, 'memberships', traineeId), {
    pendingReport: null,
    rejectedReports: [...(membership.rejectedReports ?? []), rejected],
    updatedAt: serverTimestamp(),
  });

  await createNotification({
    title: 'Comprobante rechazado',
    body: `Tu coach rechazó el comprobante que enviaste. Motivo: ${reason}`,
    type: 'sistema',
    fromId: membership.coachId,
    fromName: 'Sistema',
    recipientIds: [traineeId],
    toType: 'specific',
  });
}
