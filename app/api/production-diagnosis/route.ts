// app/api/production-diagnosis/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const diagnosis: any = {
    timestamp: new Date().toISOString(),
    environment: {
      node_env: process.env.NODE_ENV,
      vercel_env: process.env.VERCEL_ENV,
      vercel_region: process.env.VERCEL_REGION,
      is_server: typeof window === 'undefined'
    },
    firebase_config: {},
    errors: []
  };

  // Check environment variables
  const envVars = [
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'FIREBASE_SERVICE_ACCOUNT_B64',
    'FIREBASE_SERVICE_ACCOUNT'
  ];

  envVars.forEach(varName => {
    const value = process.env[varName];
    diagnosis.firebase_config[varName] = {
      exists: !!value,
      length: value ? value.length : 0,
      first_chars: value ? value.substring(0, 10) + '...' : 'NOT_SET'
    };
  });

  // Test Firebase Admin initialization
  try {
    console.log('🔥 Testing Firebase Admin initialization...');
    const { getAdminAuth, getAdminDb } = await import('@/lib/firebaseAdmin');
    
    const adminAuth = await getAdminAuth();
    const adminDb = await getAdminDb();
    
    diagnosis.firebase_admin = {
      status: '✅ SUCCESS',
      auth_initialized: !!adminAuth,
      db_initialized: !!adminDb,
      project_id: adminAuth.app?.options?.projectId || 'unknown'
    };
    
    console.log('✅ Firebase Admin initialized successfully');
    
  } catch (error: any) {
    console.error('❌ Firebase Admin initialization failed:', error);
    diagnosis.firebase_admin = {
      status: '❌ FAILED',
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 5) // First 5 lines of stack
    };
    diagnosis.errors.push(`Firebase Admin: ${error.message}`);
  }

  // Test basic database operation
  try {
    console.log('💾 Testing database operation...');
    const { getAdminDb } = await import('@/lib/firebaseAdmin');
    const adminDb = await getAdminDb();
    
    // Try to read from a collection
    const testRef = adminDb.collection('production_diagnosis_test').limit(1);
    const snapshot = await testRef.get();
    
    diagnosis.database_test = {
      status: '✅ SUCCESS',
      can_read: true,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Database read test successful');
    
  } catch (error: any) {
    console.error('❌ Database test failed:', error);
    diagnosis.database_test = {
      status: '❌ FAILED',
      error: error.message
    };
    diagnosis.errors.push(`Database: ${error.message}`);
  }

  // Test UserService
  try {
    console.log('👤 Testing UserService...');
    const { UserService } = await import('@/lib/userService');
    
    const stats = await UserService.getUserStats();
    
    diagnosis.user_service = {
      status: '✅ SUCCESS',
      user_stats: stats
    };
    
    console.log('✅ UserService test successful');
    
  } catch (error: any) {
    console.error('❌ UserService test failed:', error);
    diagnosis.user_service = {
      status: '❌ FAILED',
      error: error.message
    };
    diagnosis.errors.push(`UserService: ${error.message}`);
  }

  // Test service account parsing
  try {
    console.log('🔑 Testing service account...');
    
    const b64Account = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    if (b64Account) {
      const decoded = Buffer.from(b64Account, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      
      diagnosis.service_account = {
        status: '✅ SUCCESS',
        project_id: parsed.project_id,
        client_email: parsed.client_email?.split('@')[0] + '@...',
        has_private_key: !!parsed.private_key
      };
    } else {
      diagnosis.service_account = {
        status: '⚠️ WARNING',
        message: 'FIREBASE_SERVICE_ACCOUNT_B64 not found'
      };
    }
    
  } catch (error: any) {
    console.error('❌ Service account parsing failed:', error);
    diagnosis.service_account = {
      status: '❌ FAILED',
      error: error.message
    };
    diagnosis.errors.push(`Service Account: ${error.message}`);
  }

  // Overall health check
  const totalTests = 4;
  const passedTests = Object.values(diagnosis).filter((test: any) => 
    test?.status?.includes('✅')).length;
  
  diagnosis.health = {
    score: `${passedTests}/${totalTests}`,
    percentage: Math.round((passedTests / totalTests) * 100),
    status: passedTests === totalTests ? '🟢 HEALTHY' : 
            passedTests > totalTests / 2 ? '🟡 PARTIAL' : '🔴 CRITICAL'
  };

  console.log('📊 Production diagnosis completed:', diagnosis.health);

  return NextResponse.json(diagnosis, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  });
}