// app/api/validate-production/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { UserService } from '@/lib/userService';
import { procesosDteService } from '@/lib/procesosDteService';
import { auditLogService } from '@/lib/auditLogService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const results: any = {
    environment: process.env.VERCEL_ENV || 'development',
    timestamp: new Date().toISOString(),
    tests: {}
  };

  try {
    console.log('🔍 Validating production database operations...');

    // Test 1: Firebase Admin Initialization
    try {
      const adminAuth = await getAdminAuth();
      const adminDb = await getAdminDb();
      results.tests.firebase_admin_init = {
        status: '✅ Success',
        message: 'Firebase Admin initialized correctly'
      };
    } catch (error: any) {
      results.tests.firebase_admin_init = {
        status: '❌ Failed',
        error: error.message
      };
    }

    // Test 2: UserService Operations
    try {
      // Test getting user stats (should work even with no users)
      const userStats = await UserService.getUserStats();
      results.tests.user_service = {
        status: '✅ Success',
        message: 'UserService operations working',
        stats: userStats
      };
    } catch (error: any) {
      results.tests.user_service = {
        status: '❌ Failed',
        error: error.message
      };
    }

    // Test 3: Database Write Operation
    try {
      const adminDb = await getAdminDb();
      const testDoc = {
        test: 'production_validation',
        timestamp: new Date(),
        environment: process.env.VERCEL_ENV || 'development'
      };
      
      const docRef = await adminDb.collection('production_test').add(testDoc);
      results.tests.database_write = {
        status: '✅ Success',
        message: 'Database write operation successful',
        document_id: docRef.id
      };
    } catch (error: any) {
      results.tests.database_write = {
        status: '❌ Failed',
        error: error.message
      };
    }

    // Test 4: Database Read Operation  
    try {
      const adminDb = await getAdminDb();
      const snapshot = await adminDb.collection('production_test').limit(5).get();
      results.tests.database_read = {
        status: '✅ Success',
        message: 'Database read operation successful',
        documents_found: snapshot.docs.length
      };
    } catch (error: any) {
      results.tests.database_read = {
        status: '❌ Failed',
        error: error.message
      };
    }

    // Test 5: ProcesosDTEService (Server-side methods)
    try {
      const procesos = await procesosDteService.obtenerTodosLosProcesosServer(1);
      results.tests.procesos_dte_service = {
        status: '✅ Success',
        message: 'ProcesosDTEService working correctly',
        procesos_count: procesos.length
      };
    } catch (error: any) {
      results.tests.procesos_dte_service = {
        status: '❌ Failed',
        error: error.message
      };
    }

    // Test 6: AuditLogService
    try {
      // Test logging a sample entry
      await auditLogService.logDTEProcessing({
        userId: 'test-validation-user',
        userEmail: 'validation@test.com',
        tipoVerificacion: 'JSON',
        cantidadArchivos: 1,
        nombreArchivos: ['validation-test.json'],
        cantidadResultados: 1,
        duracionMs: 100,
        exito: true,
        metadata: { test: 'production-validation' }
      });

      results.tests.audit_service = {
        status: '✅ Success',
        message: 'AuditLogService working correctly'
      };
    } catch (error: any) {
      results.tests.audit_service = {
        status: '❌ Failed',
        error: error.message
      };
    }

    // Test 7: Environment Variables Check
    const requiredEnvVars = [
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'FIREBASE_SERVICE_ACCOUNT_B64'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      results.tests.environment_variables = {
        status: '✅ Success',
        message: 'All required environment variables are present'
      };
    } else {
      results.tests.environment_variables = {
        status: '⚠️ Warning',
        message: 'Some environment variables are missing',
        missing_vars: missingVars
      };
    }

    // Summary
    const testResults = Object.values(results.tests);
    const successCount = testResults.filter((test: any) => test.status.includes('✅')).length;
    const totalTests = testResults.length;
    
    results.summary = {
      passed: successCount,
      total: totalTests,
      success_rate: `${Math.round((successCount / totalTests) * 100)}%`,
      overall_status: successCount === totalTests ? '✅ All systems operational' : '⚠️ Some issues detected'
    };

    console.log('📊 Production validation completed:', results.summary);

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('❌ Production validation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      environment: process.env.VERCEL_ENV || 'development',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}