// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// If you also want to allow anonymous access to "/", set ALLOW_ROOT_PUBLIC = true
const ALLOW_ROOT_PUBLIC = false;

// Public, non-auth pages
const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/verify",        // e.g. /verify?token=...
  "/verify-email",  // if you use a separate page
  "/reset-password" // optional
];

// Static / framework internals that should never be intercepted
function isStaticOrInternal(pathname: string) {
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|map)$/i)
  ) return true;
  return false;
}

function isPublicPage(pathname: string) {
  if (isStaticOrInternal(pathname)) return true;
  if (PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  if (ALLOW_ROOT_PUBLIC && pathname === "/") return true;
  return false;
}

function redirectTo(urlPath: string, req: NextRequest, extraParams?: Record<string, string>) {
  const url = new URL(urlPath, req.nextUrl.origin);
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) url.searchParams.set(k, v);
  }
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 1) Skip ALL API routes entirely (important for /api/cron/reminders and others)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 2) Allow static/internals and declared public pages
  if (isPublicPage(pathname)) {
    return NextResponse.next();
  }

  // 3) Require authentication for everything else
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    // Not logged in → send to login with callback
    return redirectTo("/login", req, { callbackUrl: pathname + search });
  }

  // 4) Email verification gate
  //    We accept either a boolean "verified" or a Date-ish "emailVerified" claim on the JWT,
  //    depending on how you've set your NextAuth callbacks.
  const verifiedClaim =
    (token as any)?.verified ??
    (token as any)?.emailVerified ??
    null;

  // Interpret strings/dates as truthy if present
  const isVerified =
    typeof verifiedClaim === "boolean"
      ? verifiedClaim
      : !!verifiedClaim; // e.g., a non-empty ISO date string

  // If not verified, only allow the verification pages; otherwise redirect there
  if (!isVerified) {
    const allowedWhileUnverified =
      pathname.startsWith("/verify") ||
      pathname.startsWith("/verify-email") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup");
    if (!allowedWhileUnverified) {
      const email = (token as any)?.email || "";
      return redirectTo("/verify", req, { email });
    }
  }

  // 5) All checks passed → continue
  return NextResponse.next();
}

// Apply middleware to app pages only. Exclude /api and static assets.
export const config = {
  matcher: [
    // Run for everything except:
    //  - /api/** (APIs, including cron)
    //  - /_next/** (Next internals)
    //  - /favicon.ico and common static asset extensions
    "/((?!api|_next|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|map)$).*)",
  ],
};
