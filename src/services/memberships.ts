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
}

export interface PendingPaymentReport {
  id: string;
  imageUrl: string;
  note?: string;
  submittedAt: string;
}

export interface Membership {
  id: string;
  coachId: string;
  traineeId: string;
  planType: MembershipPlanType;
  nextDueDate: string;
  payments: MembershipPayment[];
  pendingReport: PendingPaymentReport | null;
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

export async function markPaymentReceived(traineeId: string, amount?: number): Promise<void> {
  const membership = await getMembership(traineeId);
  if (!membership) return;
  const newDueDate = addDays(membership.nextDueDate, PLAN_DAYS[membership.planType]);
  const payment: MembershipPayment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    date: new Date().toISOString(),
    planType: membership.planType,
    ...(amount !== undefined ? { amount } : {}),
  };
  await updateDoc(doc(db, 'memberships', traineeId), {
    nextDueDate: newDueDate,
    payments: [...membership.payments, payment],
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
  note?: string
): Promise<void> {
  const existing = await getMembership(traineeId);
  const report: PendingPaymentReport = {
    id: `rep_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    imageUrl,
    submittedAt: new Date().toISOString(),
    ...(note ? { note } : {}),
  };

  if (!existing) {
    await setMembershipPlan(coachId, traineeId, 'mensual');
  }
  await updateDoc(doc(db, 'memberships', traineeId), {
    pendingReport: report,
    updatedAt: serverTimestamp(),
  });

  await createNotification({
    title: 'Pago reportado',
    body: 'Un asesorado reportó un pago y espera tu confirmación.',
    type: 'coach',
    fromId: traineeId,
    fromName: 'Asesorado',
    recipientIds: [coachId],
    toType: 'specific',
  });
}

export async function confirmPaymentReport(traineeId: string): Promise<void> {
  const membership = await getMembership(traineeId);
  if (!membership?.pendingReport) return;
  const newDueDate = addDays(membership.nextDueDate, PLAN_DAYS[membership.planType]);
  const payment: MembershipPayment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    date: new Date().toISOString(),
    planType: membership.planType,
    imageUrl: membership.pendingReport.imageUrl,
  };
  await updateDoc(doc(db, 'memberships', traineeId), {
    nextDueDate: newDueDate,
    payments: [...membership.payments, payment],
    pendingReport: null,
    updatedAt: serverTimestamp(),
  });
}

export async function rejectPaymentReport(traineeId: string): Promise<void> {
  await updateDoc(doc(db, 'memberships', traineeId), {
    pendingReport: null,
    updatedAt: serverTimestamp(),
  });
}
