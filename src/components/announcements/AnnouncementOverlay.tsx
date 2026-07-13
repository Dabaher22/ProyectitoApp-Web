import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { getNotificationsForUser, hasSeenAnnouncement, markAnnouncementSeen, AppNotification } from '../../services/notifications';
import { getAnnouncementCard } from './registry';
import { canShowNextAnnouncement, markAnnouncementShownNow } from '../../store/announcementPacing';

// Auto-shows unseen card-type system announcements one at a time, oldest first,
// spaced out by a minimum gap (announcementPacing) so several launched close
// together don't all pop up at once — see the next one only after ~10 minutes.
export default function AnnouncementOverlay() {
  const { uid, role } = useAuthStore();
  const [active, setActive] = useState<AppNotification | null>(null);

  useEffect(() => {
    if (!uid || (role !== 'coach' && role !== 'trainee')) return;
    if (!canShowNextAnnouncement(uid)) return;
    let cancelled = false;

    (async () => {
      const notifs = await getNotificationsForUser(uid, role);
      const cardNotifs = notifs
        .filter((n) => getAnnouncementCard(n) !== null)
        .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0)); // más antiguo primero
      for (const n of cardNotifs) {
        const seen = await hasSeenAnnouncement(uid, n.cardKey!);
        if (cancelled) return;
        if (!seen) {
          markAnnouncementShownNow(uid);
          setActive(n);
          return;
        }
      }
    })();

    return () => { cancelled = true; };
  }, [uid, role]);

  if (!active || !uid) return null;
  const CardComponent = getAnnouncementCard(active);
  if (!CardComponent) return null;

  const handleClose = () => {
    markAnnouncementSeen(uid, active.cardKey!);
    setActive(null);
  };

  return <CardComponent onClose={handleClose} />;
}
