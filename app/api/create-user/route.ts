import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/userService';
import { UserRole } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 Creando usuario:', body);

    const { email, displayName, role = 'client' } = body;

    // Validar datos requeridos
    if (!email || !displayName) {
      return NextResponse.json({
        success: false,
        error: 'Email y displayName son requeridos'
      }, { status: 400 });
    }

    // Validar email formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Formato de email inválido'
      }, { status: 400 });
    }

    // Validar rol
    const validRoles: UserRole[] = ['admin', 'client'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({
        success: false,
        error: `Rol inválido. Debe ser: ${validRoles.join(', ')}`
      }, { status: 400 });
    }

    console.log('✅ Datos validados, creando usuario...');

    // Crear usuario completo (Firebase Auth + Firestore)
    const newUser = await UserService.createUserWithAuth(email, displayName, role);

    console.log('✅ Usuario creado exitosamente:', newUser);

    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: newUser,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error al crear usuario:', error);

    // Manejar errores específicos de Firebase
    let errorMessage = 'Error desconocido al crear usuario';
    
    if (error instanceof Error) {
      if (error.message.includes('email-already-exists')) {
        errorMessage = 'El email ya está registrado';
      } else if (error.message.includes('invalid-email')) {
        errorMessage = 'Formato de email inválido';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log('📋 Obteniendo lista de usuarios...');
    
    const users = await UserService.getAllUsers();
    
    return NextResponse.json({
      success: true,
      message: 'Usuarios obtenidos exitosamente',
      users,
      count: users.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error al obtener usuarios:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener usuarios',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}