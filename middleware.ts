import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

// أي مسار مسموح لكل دور (SUPER_ADMIN يصل لجميع المسارات)
const ROLE_ROUTES: Record<string, string[]> = {
  SUPER_ADMIN: ["/super-admin", "/admin", "/user", "/coordinator", "/auditor", "/reception"],
  ADMIN: ["/admin"],
  USER: ["/user"],
  AUDITOR: ["/auditor"],
  COORDINATOR: ["/coordinator"],
  RECEPTION: ["/reception"],
};

function hasAccess(role: string | undefined, pathname: string): boolean {
  if (!role) return false;
  const allowed = ROLE_ROUTES[role as keyof typeof ROLE_ROUTES];
  if (!allowed) return false;
  return allowed.some((base) => pathname === base || pathname.startsWith(base + "/"));
}

function getDefaultRoute(role: string | undefined): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin";
    case "ADMIN":
      return "/admin";
    case "USER":
      return "/user";
    case "AUDITOR":
      return "/auditor";
    case "COORDINATOR":
      return "/coordinator";
    case "RECEPTION":
      return "/reception";
    default:
      return "/";
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret,
  });

  const role = (token?.role as string | undefined) ?? undefined;
  const isLoggedIn = !!token;

  // مسجل ودخل على / أو /login — توجيهه حسب دوره
  if (pathname === "/" || pathname === "/login") {
    if (isLoggedIn) {
      const target = getDefaultRoute(role);
      if (target !== "/") {
        return NextResponse.redirect(new URL(target, request.url));
      }
    }
    if (pathname === "/login") return NextResponse.next();
  }

  // صفحة 403 — متاحة للجميع
  if (pathname === "/forbidden") {
    return NextResponse.next();
  }

  // مسارات محمية: يجب أن يكون مسجلاً
  const isProtected =
    pathname.startsWith("/super-admin") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/user") ||
    pathname.startsWith("/coordinator") ||
    pathname.startsWith("/auditor") ||
    pathname.startsWith("/reception");

  if (isProtected && !isLoggedIn) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  // مسجل لكن بدون صلاحية لهذا المسار
  if (isProtected && !hasAccess(role, pathname)) {
    return NextResponse.redirect(new URL("/forbidden", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/super-admin/:path*",
    "/admin/:path*",
    "/user/:path*",
    "/coordinator/:path*",
    "/auditor/:path*",
    "/reception/:path*",
    "/forbidden",
  ],
};
