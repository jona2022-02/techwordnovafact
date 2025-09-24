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
  
  // Permitir rutas públicas
  if (PUBLIC_PATHS.some(p => url.pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookieValue(req);
  if (!sessionCookie) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  try {
    // Importar dinámicamente para evitar problemas de inicialización
    const { getAdminAuth } = await import("./lib/firebaseAdmin");
    const adminAuth = await getAdminAuth();
    
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    if (!decoded.approved) {
      url.pathname = "/waiting-approval"; 
      return NextResponse.redirect(url);
    }
    
    if (url.pathname.startsWith("/admin") && decoded.role !== "admin") {
      url.pathname = "/home";
      return NextResponse.redirect(url);
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error("Middleware auth error:", error);
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
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