import { NextRequest, NextResponse } from "next/server"

// Role-based route protection middleware
const PROTECTED_ROUTES: Record<string, string[]> = {
  "/dashboard/driver": ["OPERATOR"],
  "/dashboard/admin": ["ADMIN"],
  "/dashboard/passenger": ["COMMUTER"],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionToken = request.cookies.get("radaa_session")?.value

  // Check if route needs protection
  const protectedPrefix = Object.keys(PROTECTED_ROUTES).find((prefix) =>
    pathname.startsWith(prefix)
  )

  if (!protectedPrefix) {
    return NextResponse.next()
  }

  // No session = redirect to sign in
  if (!sessionToken) {
    const signInUrl = new URL("/sign-in", request.url)
    signInUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Validate session + role via internal API
  try {
    const verifyUrl = new URL("/api/auth/me", request.url)
    const res = await fetch(verifyUrl.toString(), {
      headers: { Cookie: `radaa_session=${sessionToken}` },
    })

    if (!res.ok) {
      const signInUrl = new URL("/sign-in", request.url)
      signInUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(signInUrl)
    }

    const { user } = await res.json()
    const allowedRoles = PROTECTED_ROUTES[protectedPrefix]

    if (!allowedRoles?.includes(user.role)) {
      // Redirect to their correct dashboard
      const dashboardMap: Record<string, string> = {
        COMMUTER: "/dashboard/passenger",
        OPERATOR: "/dashboard/driver",
        ADMIN: "/dashboard/admin",
      }
      return NextResponse.redirect(
        new URL(dashboardMap[user.role] || "/", request.url)
      )
    }

    return NextResponse.next()
  } catch {
    const signInUrl = new URL("/sign-in", request.url)
    return NextResponse.redirect(signInUrl)
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
