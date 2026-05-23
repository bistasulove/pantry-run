// Shared constant so the server layout reader and the client writer (in
// useActiveList) can't drift apart. Cookie is intentionally not HttpOnly:
// the client writes it on switch, the server reads it on first paint to
// avoid a flash of the wrong list. Validated server-side against the
// current user's lists, so a tampered value just falls back to oldest.
export const ACTIVE_LIST_COOKIE = 'pr_active_list'

// One year — the cookie is harmless if stale (server falls back), and a
// long lifetime keeps the user's last-active list across browser restarts.
export const ACTIVE_LIST_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365
