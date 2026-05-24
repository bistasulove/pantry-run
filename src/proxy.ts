import { NextResponse, type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_PATHS = ['/list', '/history', '/household', '/settings']

// Cheap presence check — any sb-*-auth-token cookie means we have a session
// to validate. The (app) layout's getUser() does the authoritative check;
// the proxy's job is just the edge-side bounce.
function hasSessionCookie(request: NextRequest): boolean {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')) {
      return true
    }
  }
  return false
}

// The proxy only handles the cheap edge concern: no session ⇒ bounce to /welcome.
// The has-household / no-household routing lives in (auth)/layout.tsx and
// (app)/layout.tsx so it can read the DB without an edge-side round trip.
//
// Tab navigation in App Router is dominated by RSC payload fetches, which hit
// middleware on every click. Calling supabase.auth.getUser() there means an
// extra ~150ms round trip per tab tap on mobile. On RSC requests we skip the
// network call and rely on cookie presence + the layout's own validation. Full
// HTML loads still run updateSession() so the access token gets refreshed and
// the new cookies land on the response (server components can't write cookies,
// so middleware is the only place token refresh persists).
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )

  const isRscRequest = request.headers.get('rsc') === '1'
  if (isRscRequest) {
    if (isProtected && !hasSessionCookie(request)) {
      const url = request.nextUrl.clone()
      url.pathname = '/welcome'
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  const { response, user } = await updateSession(request)

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/welcome'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next internals)
     * - favicon.ico, icons, manifest.json (static assets)
     * - api/* (route handlers manage their own auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|api).*)',
  ],
}
