import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

// أي مسار مسموح لكل دور (SUPER_ADMIN يصل لجميع المسارات)
const ROLE_ROUTES: Record<string, string[]> = {
  SUPER_ADMIN: ["/super-admin", "/admin", "/user", "/authorized", "/coordinator", "/auditor", "/reception", "/sorting", "/documentation", "/member", "/supervisor"],
  PARLIAMENT_MEMBER: ["/member"],
  ADMIN: ["/admin"],
  USER: ["/user", "/authorized"],
  AUDITOR: ["/auditor"],
  COORDINATOR: ["/coordinator", "/documentation/admin-done"],
  RECEPTION: ["/reception"],
  SORTING: ["/sorting"],
  DOCUMENTATION: ["/documentation"],
  SUPERVISION: ["/supervisor"],
};

function isDelegate(serialNumber: string | undefined): boolean {
  return typeof serialNumber === "string" && serialNumber.startsWith("DEL-");
}

function hasAccess(role: string | undefined, pathname: string, serialNumber?: string): boolean {
  if (!role) return false;
  if (pathname.startsWith("/authorized")) {
    return role === "USER" && isDelegate(serialNumber);
  }
  if (pathname.startsWith("/user")) {
    return role === "USER" && !isDelegate(serialNumber);
  }
  const allowed = ROLE_ROUTES[role as keyof typeof ROLE_ROUTES];
  if (!allowed) return false;
  return allowed.some((base) => pathname === base || pathname.startsWith(base + "/"));
}

function getDefaultRoute(role: string | undefined, serialNumber?: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin";
    case "PARLIAMENT_MEMBER":
      return "/member";
    case "ADMIN":
      return "/admin";
    case "USER":
      return isDelegate(serialNumber) ? "/authorized" : "/user";
    case "AUDITOR":
      return "/auditor";
    case "COORDINATOR":
      return "/coordinator";
    case "RECEPTION":
      return "/reception";
    case "SORTING":
      return "/sorting";
    case "DOCUMENTATION":
      return "/documentation";
    case "SUPERVISION":
      return "/supervisor";
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
  const serialNumber = token?.serialNumber as string | undefined;
  const isLoggedIn = !!token;

  // مسجل ودخل على / أو /login — توجيهه حسب دوره
  if (pathname === "/" || pathname === "/login") {
    if (isLoggedIn) {
      const target = getDefaultRoute(role, serialNumber);
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
    pathname.startsWith("/authorized") ||
    pathname.startsWith("/coordinator") ||
    pathname.startsWith("/auditor") ||
    pathname.startsWith("/reception") ||
    pathname.startsWith("/sorting") ||
    pathname.startsWith("/documentation") ||
    pathname.startsWith("/member") ||
    pathname.startsWith("/supervisor");

  if (isProtected && !isLoggedIn) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  // مسجل لكن بدون صلاحية لهذا المسار
  if (isProtected && !hasAccess(role, pathname, serialNumber)) {
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
    "/authorized/:path*",
    "/coordinator/:path*",
    "/auditor/:path*",
    "/reception/:path*",
    "/sorting/:path*",
    "/documentation/:path*",
    "/member/:path*",
    "/supervisor/:path*",
    "/forbidden",
  ],
};
