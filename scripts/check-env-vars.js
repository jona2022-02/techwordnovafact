// scripts/check-env-vars.js
require('dotenv').config({ path: '.env.local' });
console.log('🔍 Checking environment variables...\n');

const requiredVars = {
  'Client SDK (Frontend)': [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ],
  'Admin SDK (Backend)': [
    'FIREBASE_SERVICE_ACCOUNT_B64', // Base64 encoded service account
    // OR individual parts:
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_CLIENT_EMAIL', 
    'FIREBASE_ADMIN_PRIVATE_KEY'
  ]
};

let allGood = true;

Object.entries(requiredVars).forEach(([category, vars]) => {
  console.log(`\n📋 ${category}:`);
  vars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✅' : '❌';
    const preview = value ? 
      (value.length > 50 ? `${value.substring(0, 20)}...` : value) : 
      'NOT SET';
    
    console.log(`  ${status} ${varName}: ${preview}`);
    
    if (!value && !varName.includes('FIREBASE_ADMIN_')) {
      allGood = false;
    }
  });
});

// Check if we have service account in any format
const hasB64 = !!process.env.FIREBASE_SERVICE_ACCOUNT_B64;
const hasIndividual = !!(
  process.env.FIREBASE_ADMIN_PROJECT_ID && 
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL && 
  process.env.FIREBASE_ADMIN_PRIVATE_KEY
);

console.log('\n🔑 Service Account Status:');
console.log(`  ${hasB64 ? '✅' : '❌'} Base64 format (FIREBASE_SERVICE_ACCOUNT_B64)`);
console.log(`  ${hasIndividual ? '✅' : '❌'} Individual parts (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY)`);

if (!hasB64 && !hasIndividual) {
  console.log('  ⚠️  NO SERVICE ACCOUNT FOUND! Backend operations will fail.');
  allGood = false;
}

console.log('\n📊 Summary:');
console.log(`Status: ${allGood ? '🟢 ALL GOOD' : '🔴 MISSING VARIABLES'}`);

if (!allGood) {
  console.log('\n💡 Next steps:');
  console.log('1. Copy .env.local.sample to .env.local');
  console.log('2. Fill in your Firebase configuration values');
  console.log('3. Make sure VERCEL has the same environment variables');
  process.exit(1);
} else {
  console.log('\n🚀 Environment looks good!');
}