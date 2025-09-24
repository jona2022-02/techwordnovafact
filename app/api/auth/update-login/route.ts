// app/api/auth/update-login/route.ts
import { NextResponse } from "next/server";
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { UserService } from "@/lib/userService";

export async function POST(req: Request) {
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

    // Actualizar último login
    await UserService.updateLastLogin(uid);
    
    return NextResponse.json({
      message: 'Último login actualizado'
    }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error al actualizar último login" },
      { status: 500 }
    );
  }
}