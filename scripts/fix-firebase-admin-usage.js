const fs = require('fs');
const path = require('path');

const BASE_DIR = process.cwd();

// Archivos que necesitan actualización
const filesToUpdate = [
  'app/api/users/[uid]/route.ts',
  'app/api/users/[uid]/actions/route.ts',
  'app/api/test-auth/route.ts',
  'app/api/dev/make-admin/route.ts',
  'app/api/auth/update-login/route.ts',
  'app/api/auth/sync-user/route.ts',
  'lib/userService.ts',
  'lib/rolesService.ts'
];

function updateFile(filePath) {
  const fullPath = path.join(BASE_DIR, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;

  // Reemplazar imports
  content = content.replace(
    /import\s*{\s*adminAuth\s*}\s*from\s*['"]@\/lib\/firebaseAdmin['"];?/g,
    `import { getAdminAuth } from '@/lib/firebaseAdmin';`
  );
  
  content = content.replace(
    /import\s*{\s*adminAuth,\s*adminDb\s*}\s*from\s*['"]@?\/lib\/firebaseAdmin['"];?/g,
    `import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';`
  );

  content = content.replace(
    /import\s*{\s*adminDb\s*}\s*from\s*['"]@\/lib\/firebaseAdmin['"];?/g,
    `import { getAdminDb } from '@/lib/firebaseAdmin';`
  );

  // Reemplazar uso de adminAuth.verifyIdToken
  content = content.replace(
    /(\s+)const decodedToken = await adminAuth\.verifyIdToken\(token\);/g,
    `$1const adminAuth = await getAdminAuth();\n$1const decodedToken = await adminAuth.verifyIdToken(token);`
  );

  // Reemplazar uso directo de adminDb
  content = content.replace(
    /(\s+)await adminDb\./g,
    `$1const adminDb = await getAdminDb();\n$1await adminDb.`
  );

  content = content.replace(
    /(\s+)const ([a-zA-Z_$][a-zA-Z0-9_$]*) = await adminDb\./g,
    `$1const adminDb = await getAdminDb();\n$1const $2 = await adminDb.`
  );

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Updated: ${filePath}`);
    return true;
  } else {
    console.log(`⏸️  No changes needed: ${filePath}`);
    return false;
  }
}

console.log('🔄 Updating Firebase Admin usage patterns...\n');

let updatedCount = 0;
for (const filePath of filesToUpdate) {
  if (updateFile(filePath)) {
    updatedCount++;
  }
}

console.log(`\n✨ Updated ${updatedCount} files successfully!`);
console.log('\n🚀 Make sure to test the changes and commit them.');