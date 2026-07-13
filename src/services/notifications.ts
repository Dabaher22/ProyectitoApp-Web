import {
  collection, doc, addDoc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query,
  where, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { db, getMessagingInstance } from '../config/firebase';

const VAPID_KEY = 'BMGFOnRPBiG_vEU7NpRHgqlHTesscI7uvnkT7TSVxMxJ8Mfmjtbe-7XTcEFtX_llGJw8QKZO8jRcrEbfkSAG_4g';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'coach' | 'sistema';
  fromId: string;
  fromName: string;
  recipientIds: string[];
  toType: 'specific' | 'all_trainees' | 'all_coaches' | 'all';
  createdAt: any;
  /** When set, this notification also triggers a fullscreen interactive card (see cardKey). */
  presentation?: 'card';
  /** Key into the announcement card registry — identifies which bespoke card component to render. */
  cardKey?: string;
}

// ── FCM token ────────────────────────────────────────────────────────────────

export async function requestPushPermission(uid: string): Promise<boolean> {
  try {
    const m = await getMessagingInstance();
    if (!m) return false;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;
    await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(m, { vapidKey: VAPID_KEY });
    if (token) {
      await setDoc(doc(db, 'fcmTokens', uid), { token, updatedAt: serverTimestamp() });
    }
    return true;
  } catch {
    return false;
  }
}

export async function getPushPermissionStatus(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  return Notification.permission;
}

// ── Notifications CRUD ───────────────────────────────────────────────────────

export async function createNotification(data: Omit<AppNotification, 'id' | 'createdAt'>): Promise<void> {
  await addDoc(collection(db, 'notifications'), { ...data, createdAt: serverTimestamp() });
}

export async function getNotificationsForUser(uid: string, role: 'coach' | 'trainee'): Promise<AppNotification[]> {
  const toTypeValues = role === 'trainee'
    ? ['all_trainees', 'all']
    : ['all_coaches', 'all'];

  // No orderBy — avoids composite index requirement; sort client-side
  const [broadcastSnap, specificSnap] = await Promise.all([
    getDocs(query(collection(db, 'notifications'), where('toType', 'in', toTypeValues))),
    getDocs(query(collection(db, 'notifications'), where('recipientIds', 'array-contains', uid))),
  ]);

  const map = new Map<string, AppNotification>();
  for (const d of [...broadcastSnap.docs, ...specificSnap.docs]) {
    map.set(d.id, { id: d.id, ...d.data() } as AppNotification);
  }
  return Array.from(map.values()).sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

// ── Read tracking ────────────────────────────────────────────────────────────

export async function getLastReadAt(uid: string): Promise<number> {
  try {
    const snap = await getDoc(doc(db, 'notificationReads', uid));
    if (!snap.exists()) return 0;
    const ts: Timestamp = snap.data().lastReadAt;
    return ts?.toMillis?.() ?? 0;
  } catch { return 0; }
}

export async function markAllRead(uid: string): Promise<void> {
  await setDoc(doc(db, 'notificationReads', uid), { lastReadAt: serverTimestamp() });
}

export async function getUnreadCount(uid: string, role: 'coach' | 'trainee'): Promise<number> {
  const [notifications, lastReadAt] = await Promise.all([
    getNotificationsForUser(uid, role),
    getLastReadAt(uid),
  ]);
  return notifications.filter((n) => (n.createdAt?.toMillis?.() ?? 0) > lastReadAt).length;
}

// ── FCM tokens for sending (used by admin/coach) ─────────────────────────────

export async function getFcmTokensForUsers(uids: string[]): Promise<string[]> {
  const tokens: string[] = [];
  await Promise.all(uids.map(async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'fcmTokens', uid));
      if (snap.exists()) tokens.push(snap.data().token);
    } catch {}
  }));
  return tokens;
}

// ── Card announcements ───────────────────────────────────────────────────────
// Fullscreen interactive cards (see src/components/announcements). Each shows
// once per user, then stays reachable from the notifications list.
//
// "Seen" is tracked by cardKey (not by the notification doc id) so it survives
// the underlying notification being deleted and republished — a user who already
// saw a given card never sees it pop up again just because it got relaunched.

export async function hasSeenAnnouncement(uid: string, cardKey: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'announcementSeen', `${uid}_${cardKey}`));
  return snap.exists();
}

export async function markAnnouncementSeen(uid: string, cardKey: string): Promise<void> {
  await setDoc(doc(db, 'announcementSeen', `${uid}_${cardKey}`), { seenAt: serverTimestamp() });
}

export async function getNotificationByCardKey(cardKey: string): Promise<AppNotification | null> {
  const snap = await getDocs(query(collection(db, 'notifications'), where('cardKey', '==', cardKey)));
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));
  if (docs.length === 0) return null;
  docs.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  return docs[0];
}

export async function publishAnnouncement(
  notificationId: string,
  audience: 'all' | 'all_coaches' | 'all_trainees'
): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), { toType: audience, recipientIds: [] });
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await deleteDoc(doc(db, 'notifications', notificationId));
}
