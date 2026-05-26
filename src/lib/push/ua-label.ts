// Coarse "Mac Chrome" / "iPhone Safari" label for the Settings device list.
// Intentionally lossy — we just want something the user can recognise when
// looking at a list of their own registered browsers. No UA-parsing library;
// the heuristics here cover the platforms Push works on (per CanIUse §M16).

export function userAgentLabel(ua: string): string {
  const platform = detectPlatform(ua)
  const browser = detectBrowser(ua)
  if (platform && browser) return `${platform} ${browser}`
  return browser || platform || 'Browser'
}

function detectPlatform(ua: string): string | null {
  if (/iPhone|iPod/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Mac OS X/.test(ua) && !/Mobile/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Linux/.test(ua)) return 'Linux'
  return null
}

function detectBrowser(ua: string): string | null {
  // Edge first — its UA contains "Chrome" too.
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\//.test(ua)) return 'Opera'
  if (/Firefox\//.test(ua)) return 'Firefox'
  // Safari on iOS reports as "Safari" in its UA; Chrome on iOS reports CriOS.
  if (/CriOS\//.test(ua)) return 'Chrome'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua)) return 'Safari'
  return null
}
