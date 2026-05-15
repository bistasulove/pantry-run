import { NextResponse, type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'

const AUTH_PATHS = ['/welcome', '/create', '/join']
const PROTECTED_PATHS = ['/list', '/household', '/settings']

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

  // M2 will add: redirect signed-in users with a household away from AUTH_PATHS to /list.
  void AUTH_PATHS

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
