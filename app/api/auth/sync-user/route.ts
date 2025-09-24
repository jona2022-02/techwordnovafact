// app/api/auth/sync-user/route.ts
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

    // Obtener los datos del usuario desde Firestore
    const user = await UserService.getUserById(uid);
    
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Sincronizar Custom Claims con los datos de Firestore
    await adminAuth.setCustomUserClaims(uid, {
      role: user.role,
      permissions: user.permissions
    });

    return NextResponse.json({
      message: 'Usuario sincronizado correctamente',
      user: {
        uid: user.uid,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    }, { status: 200 });

  } catch (e: any) {
    console.error('Error sincronizando usuario:', e);
    return NextResponse.json(
      { error: e?.message ?? "Error al sincronizar usuario" },
      { status: 500 }
    );
  }
}