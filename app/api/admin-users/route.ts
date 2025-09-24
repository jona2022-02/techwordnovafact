import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const db = await getAdminDb();
    
    // Obtener usuarios de Firestore
    let query = db.collection('users').orderBy('createdAt', 'desc');
    
    if (offset > 0) {
      // Para paginación simple, usar limit y offset
      query = query.limit(limit + offset);
    } else {
      query = query.limit(limit);
    }
    
    const usersSnapshot = await query.get();
    const allUsers: any[] = [];
    
    usersSnapshot.forEach(doc => {
      allUsers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Aplicar offset manualmente si es necesario
    const users = offset > 0 ? allUsers.slice(offset) : allUsers;
    
    // Enriquecer datos de usuarios con información de membresías
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        try {
          // Obtener membresía del usuario
          const membershipDoc = await db.collection('userMemberships').doc(user.id).get();
          const userMembership = membershipDoc.exists ? membershipDoc.data() : null;
          
          // Obtener detalles de la membresía si existe
          let membershipDetails = null;
          if (userMembership?.membershipId) {
            const membershipDetailsDoc = await db.collection('memberships').doc(userMembership.membershipId).get();
            membershipDetails = membershipDetailsDoc.exists ? membershipDetailsDoc.data() : null;
          }
          
          return {
            ...user,
            userMembership: userMembership,
            membershipDetails: membershipDetails,
            hasActiveMembership: userMembership?.status === 'active',
            membershipName: membershipDetails?.name || 'Sin membresía'
          };
        } catch (error) {
          console.error(`Error enriching user ${user.id}:`, error);
          return {
            ...user,
            userMembership: null,
            membershipDetails: null,
            hasActiveMembership: false,
            membershipName: 'Error'
          };
        }
      })
    );
    
    // Obtener estadísticas
    const stats = {
      total: enrichedUsers.length,
      active: enrichedUsers.filter(u => u.hasActiveMembership).length,
      admins: enrichedUsers.filter(u => u.role === 'admin').length,
      recent: enrichedUsers.filter(u => {
        const createdAt = new Date(u.createdAt);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return createdAt > weekAgo;
      }).length
    };
    
    return NextResponse.json({
      success: true,
      data: {
        users: enrichedUsers,
        stats: stats,
        pagination: {
          limit: limit,
          offset: offset,
          hasMore: usersSnapshot.size === limit + offset
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting users:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role = 'user', membershipId = 'free' } = body;
    
    if (!email || !password || !name) {
      return NextResponse.json({
        success: false,
        error: 'Email, password y name son requeridos'
      }, { status: 400 });
    }
    
    const auth = await getAdminAuth();
    const db = await getAdminDb();
    
    // Crear usuario en Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: name,
      emailVerified: true
    });
    
    // Crear documento de usuario en Firestore
    const userData = {
      uid: userRecord.uid,
      email: userRecord.email,
      name: name,
      role: role,
      emailVerified: true,
      membershipId: membershipId,
      membershipStatus: 'active',
      permissions: role === 'admin' ? {
        'admin.users.read': true,
        'admin.users.write': true,
        'admin.permissions.read': true,
        'admin.permissions.write': true,
        'admin.reports.read': true,
        'admin.reports.write': true,
        'verificadorDTE.read': true,
        'verificadorDTE.write': true,
        'procesaedte.read': true,
        'procesaedte.write': true,
        'bancos.read': true,
        'bancos.write': true,
        'memberships.read': true,
        'memberships.write': true
      } : {
        'verificadorDTE.read': true,
        'verificadorDTE.write': false,
        'procesaedte.read': true,
        'procesaedte.write': false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await db.collection('users').doc(userRecord.uid).set(userData);
    
    // Crear membresía del usuario
    const userMembership = {
      userId: userRecord.uid,
      membershipId: membershipId,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: true,
      paymentMethod: 'admin_created',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await db.collection('userMemberships').doc(userRecord.uid).set(userMembership);
    
    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        user: userData,
        membership: userMembership
      }
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}