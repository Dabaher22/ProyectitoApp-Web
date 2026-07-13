const KEY = 'pending_invite_code';

/** Reads ?invite=CODE from the current URL (if present) and stashes it in sessionStorage,
 * so it survives client-side navigation between /login, /register and /select-role. */
export function capturePendingInviteFromUrl(): void {
  const code = new URLSearchParams(window.location.search).get('invite');
  if (code) sessionStorage.setItem(KEY, code.toUpperCase().trim());
}

export function getPendingInvite(): string | null {
  return sessionStorage.getItem(KEY);
}

export function clearPendingInvite(): void {
  sessionStorage.removeItem(KEY);
}
