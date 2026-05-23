// Minimal client-side cookie helpers. The Supabase auth cookie is managed
// by @supabase/ssr; everything else we set ourselves goes through here.
// SameSite=Lax + Secure (when on https) is the right default for app state
// cookies — the server reads them on same-origin requests only.

export interface SetCookieOptions {
  maxAgeSeconds?: number
  path?: string
}

export function setCookie(name: string, value: string, options: SetCookieOptions = {}): void {
  if (typeof document === 'undefined') return
  const { maxAgeSeconds, path = '/' } = options
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const parts = [`${name}=${encodeURIComponent(value)}`, `path=${path}`, 'samesite=lax']
  if (maxAgeSeconds !== undefined) parts.push(`max-age=${maxAgeSeconds}`)
  if (isHttps) parts.push('secure')
  document.cookie = parts.join('; ')
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const prefix = `${name}=`
  for (const raw of document.cookie.split('; ')) {
    if (raw.startsWith(prefix)) {
      return decodeURIComponent(raw.slice(prefix.length))
    }
  }
  return null
}
