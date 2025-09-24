// Script para probar login con credenciales específicas
const API_BASE = 'https://verificador-7jq8gzrml-jona2022-02s-projects.vercel.app';

async function testLogin() {
  console.log('=== Testing Login Process ===');
  
  const credentials = {
    email: 'alexanderhernandz78@gmail.com',
    password: 'admin321'
  };
  
  try {
    console.log('Testing with:', credentials.email);
    
    const response = await fetch(`${API_BASE}/api/debug/login-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    const result = await response.json();
    console.log('Login test result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ LOGIN DEBUG SUCCESS');
      console.log('User UID:', result.data.authUser.uid);
      console.log('Email verified:', result.data.authUser.emailVerified);
      console.log('Has permissions:', result.data.hasPermissions);
      console.log('Permission count:', result.data.permissionCount);
      console.log('Membership:', result.data.membership ? 'Found' : 'Not found');
    } else {
      console.log('\n❌ LOGIN DEBUG FAILED');
      console.log('Error:', result.error);
      console.log('Step:', result.step);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// También probar listar usuarios
async function listUsers() {
  console.log('\n=== Listing Users in Database ===');
  
  try {
    const response = await fetch(`${API_BASE}/api/debug/login-test`);
    const result = await response.json();
    
    if (result.success) {
      console.log(`Found ${result.totalFound} users:`);
      result.users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.id})`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Permissions: ${user.hasPermissions ? 'Yes' : 'No'}`);
        console.log(`   Membership: ${user.membershipId || 'None'}`);
        console.log('');
      });
    } else {
      console.error('Failed to list users:', result.error);
    }
  } catch (error) {
    console.error('List users failed:', error);
  }
}

// Ejecutar ambas pruebas
async function runTests() {
  await listUsers();
  await testLogin();
}

runTests();