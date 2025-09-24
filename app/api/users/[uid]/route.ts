// app/api/users/[uid]/route.ts
import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { UserService } from "@/lib/userService";
import { RolesService } from "@/lib/rolesService";
import { UserRole } from "@/types/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const profile = await UserService.getUserById(uid);
    if (!profile) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(profile, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "No se pudo obtener el usuario" },
      { status: 404 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const body = await req.json();
    const { role, permissions, isActive, displayName, phoneNumber, avatar } = body;
    const { uid } = await params;

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

    // Actualizar rol si se proporciona
    if (role) {
      await UserService.updateUserRole(uid, role as UserRole);
    } else if (permissions) {
      // Actualizar solo permisos
      await UserService.updateUserPermissions(uid, permissions);
    }

    // Actualizar estado activo si se proporciona
    if (typeof isActive === 'boolean') {
      await UserService.toggleUserStatus(uid, isActive);
    }

    // Actualizar perfil si se proporcionan datos
    const profileUpdates: any = {};
    if (displayName !== undefined) profileUpdates.displayName = displayName;
    if (phoneNumber !== undefined) profileUpdates.phoneNumber = phoneNumber;
    if (avatar !== undefined) profileUpdates.avatar = avatar;

    if (Object.keys(profileUpdates).length > 0) {
      await UserService.updateUserProfile(uid, profileUpdates);
    }

    const updatedProfile = await UserService.getUserById(uid);
    return NextResponse.json(updatedProfile, { status: 200 });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "No se pudo actualizar el usuario" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const url = new URL(req.url);
    const hardDelete = url.searchParams.get('hard') === 'true';

    await UserService.deleteUser(uid, hardDelete);

    return NextResponse.json({
      message: hardDelete ? 'Usuario eliminado permanentemente' : 'Usuario desactivado'
    }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "No se pudo eliminar el usuario" },
      { status: 500 }
    );
  }
}