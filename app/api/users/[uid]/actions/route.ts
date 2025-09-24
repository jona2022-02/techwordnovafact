// app/api/users/[uid]/actions/route.ts
import { NextResponse } from "next/server";
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { UserService } from "@/lib/userService";
import { RolesService } from "@/lib/rolesService";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
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

    const { uid } = await params;
    const body = await req.json();
    const { action, email } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Campo requerido: action' }, 
        { status: 400 }
      );
    }

    let message = '';
    
    switch (action) {
      case 'sendVerificationEmail':
        await UserService.sendVerificationEmail(uid);
        message = 'Email de verificación enviado';
        break;
        
      case 'sendPasswordReset':
        if (!email) {
          return NextResponse.json(
            { error: 'Email requerido para reset de contraseña' }, 
            { status: 400 }
          );
        }
        await UserService.sendPasswordResetEmail(email);
        message = 'Email de reset de contraseña enviado';
        break;
        
      case 'forcePasswordReset':
        await UserService.forcePasswordReset(uid);
        message = 'Contraseña reseteada forzosamente';
        break;
        
      default:
        return NextResponse.json(
          { error: 'Acción no válida' }, 
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message
    }, { status: 200 });

  } catch (e: any) {
    console.error('🚨 API /users/[uid]/actions: Error:', e);
    
    return NextResponse.json(
      { error: e?.message ?? "No se pudo ejecutar la acción" },
      { status: 500 }
    );
  }
}