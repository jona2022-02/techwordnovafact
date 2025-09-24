// app/api/auth/initialize/route.ts
import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';
import { UserService } from "@/lib/userService";
import { UserRole } from "@/types/auth";

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

    const body = await req.json();
    const { email, displayName, role = 'client' } = body;

    // Verificar si el usuario ya existe
    const existingUser = await UserService.getUserById(uid);
    
    if (!existingUser) {
      // Usuario no existe, crearlo usando initializeUser
      const initializedUser = await UserService.initializeUser(uid);
      if (!initializedUser) {
        throw new Error('Error al inicializar usuario');
      }
    } else {
      // Usuario ya existe, actualizar último login
      await UserService.updateLastLogin(uid);
    }

    const user = await UserService.getUserById(uid);
    
    return NextResponse.json({
      message: 'Usuario inicializado correctamente',
      user
    }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error al inicializar usuario" },
      { status: 500 }
    );
  }
}