// app/api/users/route.ts
import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { UserService } from "@/lib/userService";
import { RolesService } from "@/lib/rolesService";
import { UserRole } from "@/types/auth";
import { logger } from "@/lib/logger";

// Prevent pre-rendering during build
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    logger.info('API /users: Starting GET request');
    
    // Verify that the requesting user is admin
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('API /users: Token required - Header missing');
      return NextResponse.json({ error: 'Token requerido' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    logger.debug('API /users: Token received, verifying...');
    
    const adminAuth = await getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    logger.debug('API /users: Token verified for user', decodedToken.uid);
    
    const isRequestAdmin = await RolesService.isAdmin(decodedToken.uid);
    logger.debug('API /users: Admin verification result', { uid: decodedToken.uid, isAdmin: isRequestAdmin });

    if (!isRequestAdmin) {
      logger.warn('API /users: Insufficient permissions', { uid: decodedToken.uid });
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // Get query parameters
    const url = new URL(req.url);
    const maxResults = parseInt(url.searchParams.get('limit') || '50');
    const role = url.searchParams.get('role') as UserRole | null;
    
    logger.info('API /users: Fetching users...');
    const users = role 
      ? await UserService.getUsersByRole(role)
      : await UserService.getAllUsers(maxResults);
    
    logger.info('API /users: Users fetched successfully', { count: users.length });
    
    return NextResponse.json({
      users,
      total: users.length
    }, { status: 200 });

  } catch (e: any) {
    logger.error('API /users: Error occurred', e);
    return NextResponse.json(
      { error: e?.message ?? "No se pudieron obtener los usuarios" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    logger.info('API /users POST: Starting user creation');

    // Verify that the requesting user is admin
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('API /users POST: Token required');
      return NextResponse.json({ error: 'Token requerido' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const adminAuth = await getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const isRequestAdmin = await RolesService.isAdmin(decodedToken.uid);
    
    logger.debug('API /users POST: Admin verification', { uid: decodedToken.uid, isAdmin: isRequestAdmin });

    if (!isRequestAdmin) {
      logger.warn('API /users POST: Insufficient permissions', { uid: decodedToken.uid });
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await req.json();
    const { email, displayName, role } = body;

    logger.debug('API /users POST: Received client data', { email, displayName, role });

    if (!email || !displayName || !role) {
      logger.warn('API /users POST: Missing required fields');
      return NextResponse.json(
        { error: 'Campos requeridos: email, displayName, role' }, 
        { status: 400 }
      );
    }

    // Validate displayName
    if (displayName.length < 2) {
      return NextResponse.json(
        { error: 'El nombre debe tener al menos 2 caracteres' }, 
        { status: 400 }
      );
    }

    if (displayName.length > 100) {
      return NextResponse.json(
        { error: 'El nombre no puede exceder 100 caracteres' }, 
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' }, 
        { status: 400 }
      );
    }

    // Validate role
    if (!['admin', 'client'].includes(role)) {
      return NextResponse.json(
        { error: 'Rol inválido. Debe ser "admin" o "client"' }, 
        { status: 400 }
      );
    }

    logger.debug('API /users POST: Data validated, creating user...');

    // Create complete user with Firebase Auth and Firestore
    const newUser = await UserService.createUserWithAuth(email, displayName, role);
    
    logger.info('API /users POST: User created successfully', { email });
    
    return NextResponse.json({
      message: 'Usuario creado exitosamente',
      user: newUser
    }, { status: 201 });

  } catch (e: any) {
    logger.error('API /users POST: Error occurred', e);
    
    // Handle specific Firebase Auth errors
    if (e.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'Ya existe un usuario con este email' },
        { status: 409 }
      );
    }
    
    if (e.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'El formato del email es inválido' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: e?.message ?? "No se pudo crear el usuario" },
      { status: 500 }
    );
  }
}