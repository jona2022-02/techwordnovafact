// app/api/auth/check-permission/route.ts
import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';
import { UserService } from "@/lib/userService";

export async function GET(req: Request) {
  try {
    // Verificar token de autenticación
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const adminAuth = await getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const { uid } = decodedToken;

    const url = new URL(req.url);
    const permissionId = url.searchParams.get('permission');

    if (!permissionId) {
      return NextResponse.json({ error: 'Permiso requerido' }, { status: 400 });
    }

    // Verificar permiso
    const hasPermission = await UserService.userHasPermission(uid, permissionId);
    
    return NextResponse.json({
      hasPermission
    }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error al verificar permiso", hasPermission: false },
      { status: 500 }
    );
  }
}