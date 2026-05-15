import { NextResponse, type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_PATHS = ['/list', '/household', '/settings']

// The proxy only handles the cheap edge concern: no session ⇒ bounce to /welcome.
// The has-household / no-household routing lives in (auth)/layout.tsx and
// (app)/layout.tsx so it can read the DB without an edge-side round trip.
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )

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
