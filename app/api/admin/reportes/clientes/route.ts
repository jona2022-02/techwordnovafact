// app/api/admin/reportes/clientes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { procesosDteService } from '@/lib/procesosDteService';
import { RolesService } from '@/lib/rolesService';

export const dynamic = 'force-dynamic';

// Función de autenticación integrada
async function authenticate(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Token de autorización requerido' };
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return { error: 'Token de autorización inválido' };
    }

    const adminAuth = await getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    return {
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
      }
    };

  } catch (error: any) {
    console.error('❌ Error en authenticate:', error);
    return { error: 'Token de autorización inválido o expirado' };
  }
}

interface ClienteResumen {
  uid: string;
  email: string;
  displayName?: string;
  totalProcesos: number;
  procesosExitosos: number;
  ultimoProceso?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await authenticate(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { user } = authResult;
    if (!user) {
      return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
    }

    // Verificar si es administrador
    try {
      const userProfile = await RolesService.getUserProfile(user.uid);
      if (!userProfile || userProfile.role !== 'admin') {
        return NextResponse.json({ error: 'Acceso denegado - Se requiere rol de administrador' }, { status: 403 });
      }
    } catch (roleError: any) {
      console.error('❌ Error verificando rol:', roleError);
      return NextResponse.json({ error: 'Error verificando permisos' }, { status: 500 });
    }

    // Obtener todos los procesos para agrupar por usuario usando método del servidor
    const procesos = await procesosDteService.obtenerTodosLosProcesosServer(1000);

    // Agrupar procesos por usuario
    const clientesMap = new Map<string, ClienteResumen>();

    procesos.forEach(proceso => {
      const clienteId = proceso.userId;
      
      if (!clientesMap.has(clienteId)) {
        clientesMap.set(clienteId, {
          uid: proceso.userId,
          email: proceso.userEmail,
          displayName: proceso.userEmail.split('@')[0], // Usar parte antes del @ como nombre
          totalProcesos: 0,
          procesosExitosos: 0,
          ultimoProceso: undefined
        });
      }

      const cliente = clientesMap.get(clienteId)!;
      cliente.totalProcesos++;
      if (proceso.exito) {
        cliente.procesosExitosos++;
      }

      // Actualizar último proceso (los procesos ya vienen ordenados por fecha desc)
      if (!cliente.ultimoProceso || new Date(proceso.fechaHora) > new Date(cliente.ultimoProceso)) {
        cliente.ultimoProceso = proceso.fechaHora.toISOString();
      }
    });

    const clientes = Array.from(clientesMap.values())
      .sort((a, b) => b.totalProcesos - a.totalProcesos); // Ordenar por total de procesos

    return NextResponse.json({ 
      clientes,
      total: clientes.length 
    });

  } catch (error: any) {
    console.error('❌ Error en API admin/reportes/clientes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message }, 
      { status: 500 }
    );
  }
}