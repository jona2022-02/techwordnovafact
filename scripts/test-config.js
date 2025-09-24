const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

console.log('\n=== Testing New Environment Variable Configuration ===');

// Variables del cliente (Next.js)
console.log('\n1. Client-side Firebase Config:');
console.log('NEXT_PUBLIC_FB_API_KEY:', process.env.NEXT_PUBLIC_FB_API_KEY ? 'Found' : 'Missing');
console.log('NEXT_PUBLIC_FB_AUTH_DOMAIN:', process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN ? 'Found' : 'Missing');
console.log('NEXT_PUBLIC_FB_PROJECT_ID:', process.env.NEXT_PUBLIC_FB_PROJECT_ID ? 'Found' : 'Missing');
console.log('NEXT_PUBLIC_FB_STORAGE:', process.env.NEXT_PUBLIC_FB_STORAGE ? 'Found' : 'Missing');
console.log('NEXT_PUBLIC_FB_MSG_SENDER_ID:', process.env.NEXT_PUBLIC_FB_MSG_SENDER_ID ? 'Found' : 'Missing');
console.log('NEXT_PUBLIC_FB_APP_ID:', process.env.NEXT_PUBLIC_FB_APP_ID ? 'Found' : 'Missing');

// Variables de admin
console.log('\n2. Admin Firebase Config:');
console.log('FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT ? 'Found (JSON string)' : 'Missing');

// Probar parseo del service account
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('Service Account Parse: ✅ Success');
    console.log('Project ID from SA:', serviceAccount.project_id || 'Missing');
    console.log('Client Email from SA:', serviceAccount.client_email || 'Missing');
  } catch (error) {
    console.log('Service Account Parse: ❌ Failed -', error.message);
  }
} else {
  console.log('Service Account Parse: ❌ No FIREBASE_SERVICE_ACCOUNT found');
}

console.log('\n3. Configuration Summary:');
const clientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FB_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FB_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FB_STORAGE,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FB_MSG_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FB_APP_ID,
};

console.log('Final client config ready:', Object.values(clientConfig).every(val => val) ? '✅' : '❌');
console.log('Missing values:', Object.entries(clientConfig)
  .filter(([key, val]) => !val)
  .map(([key]) => key)
  .join(', ') || 'None');

console.log('\n=== Test Complete ===');