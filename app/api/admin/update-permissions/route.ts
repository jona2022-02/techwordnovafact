import { NextRequest, NextResponse } from 'next/server';
import firebaseAdmin from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { action, permission } = await request.json();

    if (action === 'add-permission' && permission === 'debug-memberships') {
      // Buscar usuarios administradores
      const usersSnapshot = await firebaseAdmin
        .firestore()
        .collection('users')
        .where('role', '==', 'admin')
        .get();

      let updatedCount = 0;

      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        const currentPermissions = userData.permissions || [];

        if (!currentPermissions.includes('debug-memberships')) {
          await doc.ref.update({
            permissions: [...currentPermissions, 'debug-memberships'],
            updatedAt: new Date().toISOString()
          });
          updatedCount++;
          console.log(`Added debug-memberships permission to ${userData.email}`);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Updated ${updatedCount} admin users with debug-memberships permission`
      });
    }

    return NextResponse.json(
      { error: 'Invalid action or permission' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error updating permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}