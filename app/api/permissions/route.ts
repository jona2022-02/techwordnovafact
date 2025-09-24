// app/api/permissions/route.ts
import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { RolesService } from "@/lib/rolesService";
import { AVAILABLE_PERMISSIONS } from "@/types/auth";

export async function GET(req: Request) {
  try {
    // Verificar que el usuario que hace la petición es admin
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const adminAuth = await getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const isRequestAdmin = await RolesService.isAdmin(decodedToken.uid);

    if (!isRequestAdmin) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    return NextResponse.json({
      permissions: AVAILABLE_PERMISSIONS
    }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "No se pudieron obtener los permisos" },
      { status: 500 }
    );
  }
}