import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login", 
  "/reset-password",
  "/waiting-approval",
  "/api/auth",
  "/api/public-test", // Para testing
  "/_next",
  "/favicon.ico",
];

function getSessionCookieValue(req: NextRequest) {
  return req.cookies.get("session")?.value || null;
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  
  // TEMPORAL: Permitir acceso sin autenticación en desarrollo local
  if (process.env.NODE_ENV === 'development' && url.hostname === 'localhost') {
    return NextResponse.next();
  }
  
  // Permitir rutas públicas
  if (PUBLIC_PATHS.some(p => url.pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookieValue(req);
  if (!sessionCookie) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // En lugar de verificar en middleware, dejamos que cada ruta API maneje su propia autenticación
  // Esto evita problemas con Edge Runtime y Firebase Admin
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/home/:path*",
    "/verificadorDTE/:path*", 
    "/consultarjson/:path*",
    "/admin/:path*",
    "/usuarios/:path*",
    "/bancos/:path*",
    "/configuraciones/:path*",
    "/mi-membresia/:path*",
    "/mi-actividad/:path*",
    "/membership/:path*",
    "/activate-membership/:path*",
    "/debug/:path*",
  ],
};