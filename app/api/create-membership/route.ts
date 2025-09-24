import { NextRequest, NextResponse } from 'next/server';
import { membershipService } from '@/lib/membershipService';
import { UserService } from '@/lib/userService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 Creando membresía:', body);

    const { 
      userId, 
      planId = 'basic', 
      durationMonths = 1,
      startDate,
      customEndDate 
    } = body;

    // Validar datos requeridos
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId es requerido'
      }, { status: 400 });
    }

    // Verificar que el usuario existe
    const user = await UserService.getUserById(userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Usuario no encontrado'
      }, { status: 404 });
    }

    // Calcular fechas
    const start = startDate ? new Date(startDate) : new Date();
    let end: Date;

    if (customEndDate) {
      end = new Date(customEndDate);
    } else {
      end = new Date(start);
      end.setMonth(end.getMonth() + durationMonths);
    }

    // Validar fechas
    if (end <= start) {
      return NextResponse.json({
        success: false,
        error: 'La fecha de fin debe ser posterior a la fecha de inicio'
      }, { status: 400 });
    }

    console.log('✅ Datos validados, creando membresía...');
    console.log(`📅 Período: ${start.toISOString()} - ${end.toISOString()}`);

    // Calcular duración en días
    const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Crear membresía
    const membership = await membershipService.activateUserMembership(
      userId, 
      planId,
      durationDays
    );

    console.log('✅ Membresía creada exitosamente:', membership);

    return NextResponse.json({
      success: true,
      message: 'Membresía creada exitosamente',
      membership,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      },
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        durationMonths
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error al crear membresía:', error);
    
    let errorMessage = 'Error desconocido al crear membresía';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      // Obtener membresía específica de un usuario
      console.log('🔍 Obteniendo membresía del usuario:', userId);
      
      const membership = await membershipService.getUserMembership(userId);
      const status = await membershipService.checkMembershipStatus(userId);
      
      return NextResponse.json({
        success: true,
        message: 'Membresía obtenida exitosamente',
        membership,
        status,
        timestamp: new Date().toISOString()
      });
    } else {
      // Obtener configuración de membresías
      console.log('📋 Obteniendo configuración de membresías...');
      
      const settings = await membershipService.getMembershipSettings();
      
      return NextResponse.json({
        success: true,
        message: 'Configuración obtenida exitosamente',
        settings,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error al obtener datos de membresía:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener datos',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}