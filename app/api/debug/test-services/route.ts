// Endpoint de debug para probar los servicios
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing services...');
    
    // Test 1: Verificar que los imports funcionen
    const { optimizedAuditService } = await import('@/lib/optimizedAuditService');
    const { UserService } = await import('@/lib/userService');
    
    console.log('✅ Imports successful');
    
    // Test 2: Verificar optimizedAuditService
    try {
      const summary = await optimizedAuditService.getUsersActivitySummary();
      console.log('✅ OptimizedAuditService works, results:', summary.length);
    } catch (auditError) {
      console.log('❌ OptimizedAuditService error:', auditError);
    }
    
    // Test 3: Verificar UserService
    try {
      const users = await UserService.getAllUsers(5);
      console.log('✅ UserService works, results:', users.length);
    } catch (userError) {
      console.log('❌ UserService error:', userError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Debug test completed, check console logs'
    });
    
  } catch (error) {
    console.error('🚨 Debug test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}