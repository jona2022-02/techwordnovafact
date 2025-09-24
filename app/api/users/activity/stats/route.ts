// app/api/users/activity/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { optimizedAuditService } from '@/lib/optimizedAuditService';
import { authenticate } from '@/lib/apiSecurity';
import { logger } from '@/lib/logger';

const serviceLogger = logger.service('UserActivityStatsAPI');

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticate(request);
    
    if (!authResult.success || !authResult.user) {
      serviceLogger.warn('Unauthorized access attempt to user activity stats');
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Los usuarios solo pueden ver sus propias estadísticas
    const stats = await optimizedAuditService.getUserStats(authResult.user.uid);

    serviceLogger.info('User activity stats retrieved', {
      userId: authResult.user.uid,
      userEmail: authResult.user.email,
      totalProcesos: stats.totalProcesos
    });

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    serviceLogger.error('Error retrieving user activity stats', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}