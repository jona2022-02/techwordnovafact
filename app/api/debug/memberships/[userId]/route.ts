import { NextRequest, NextResponse } from 'next/server';
import firebaseAdmin from '@/lib/firebaseAdmin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Obtener todas las membresías del usuario
    const membershipsSnapshot = await firebaseAdmin
      .firestore()
      .collection('userMemberships')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const memberships = membershipsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    // También buscar por otras posibles estructuras
    const alternativeSnapshot = await firebaseAdmin
      .firestore()
      .collection('memberships')
      .where('userId', '==', userId)
      .get();

    const alternativeMemberships = alternativeSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`[DEBUG] User ${userId} memberships:`, {
      userMemberships: memberships.length,
      memberships: alternativeMemberships.length,
      total: memberships.length + alternativeMemberships.length
    });

    return NextResponse.json({
      success: true,
      memberships: [...memberships, ...alternativeMemberships],
      userMembershipsCount: memberships.length,
      membershipsCount: alternativeMemberships.length
    });

  } catch (error) {
    console.error('Error fetching user memberships:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}