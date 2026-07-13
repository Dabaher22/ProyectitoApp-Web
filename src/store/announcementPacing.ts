const KEY_PREFIX = 'announcement_last_shown_';
export const ANNOUNCEMENT_GAP_MS = 10 * 60 * 1000; // 10 minutos entre anuncios consecutivos

/** 0 if no card announcement has ever been shown to this user on this device. */
export function getLastAnnouncementShownAt(uid: string): number {
  const v = localStorage.getItem(KEY_PREFIX + uid);
  return v ? Number(v) : 0;
}

export function markAnnouncementShownNow(uid: string): void {
  localStorage.setItem(KEY_PREFIX + uid, String(Date.now()));
}

/** True when it's OK to pop the next queued announcement (first ever, or gap has elapsed). */
export function canShowNextAnnouncement(uid: string): boolean {
  const last = getLastAnnouncementShownAt(uid);
  return last === 0 || Date.now() - last >= ANNOUNCEMENT_GAP_MS;
}
