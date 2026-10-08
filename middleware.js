import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/pending-approval",
  "/api/signup",
  "/api/auth",
  "/api/health",
  "/api/marketing/cron",
];

function applySecurityHeaders(response) {
  const securityHeaders = {
    "X-DNS-Prefetch-Control": "on",
    "X-Frame-Options": "SAMEORIGIN",
    "X-Content-Type-Options": "nosniff",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  };

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isPortalAllowedPath(pathname, portalPrefix) {
  return (
    pathname.startsWith(portalPrefix) ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/login") ||
    isPublicPath(pathname)
  );
}

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);
  const role = request.auth?.user?.role;
  const status = request.auth?.user?.status;

  if (pathname === "/login" && request.auth) {
    const home =
      status === "pending_approval"
        ? "/pending-approval"
        : role === "customer"
          ? "/customer/dashboard"
          : role === "franchise"
            ? "/franchise/dashboard"
            : "/dashboard";
    return applySecurityHeaders(NextResponse.redirect(new URL(home, request.url)));
  }

  if (!request.auth && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // Pending approval users: restrict to only pending-approval page
  if (request.auth && status === "pending_approval") {
    const allowedForPending =
      pathname.startsWith("/pending-approval") ||
      pathname.startsWith("/api/auth") ||
      pathname.startsWith("/api/signup") ||
      pathname === "/login";

    if (!allowedForPending) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/pending-approval", request.url)),
      );
    }

    return applySecurityHeaders(NextResponse.next());
  }

  if (request.auth) {
    if (role === "customer" && !isPortalAllowedPath(pathname, "/customer")) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/customer/dashboard", request.url)),
      );
    }

    if (role === "franchise" && !isPortalAllowedPath(pathname, "/franchise")) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/franchise/dashboard", request.url)),
      );
    }

    if (
      role === "admin" &&
      (pathname.startsWith("/customer/dashboard") || pathname.startsWith("/franchise/dashboard"))
    ) {
      return applySecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
    }
  }

  return applySecurityHeaders(NextResponse.next());
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|images|icons|uploads|brand).*)",
  ],
};
