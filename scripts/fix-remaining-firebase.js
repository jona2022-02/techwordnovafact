const fs = require('fs');
const path = require('path');

// Lista de archivos que necesitan reparación
const filesToFix = [
  'app/api/admin/check-permissions/route.ts',
  'app/api/admin/procesos-dte/route.ts', 
  'app/api/admin/reportes/clientes/route.ts',
  'lib/authMiddleware.ts',
  'lib/auditLogService.ts',
  'lib/optimizedAuditService.ts',
  'lib/procesosDteService.ts',
];

console.log('🔧 Fixing remaining Firebase Admin usage...\n');

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // 1. Actualizar imports
  if (content.includes('import { adminAuth }')) {
    content = content.replace(
      /import\s*{\s*adminAuth\s*}\s*from\s*['"]@\/lib\/firebaseAdmin['"];?/g,
      `import { getAdminAuth } from '@/lib/firebaseAdmin';`
    );
  }

  if (content.includes('import { adminDb }')) {
    content = content.replace(
      /import\s*{\s*adminDb\s*}\s*from\s*['"]@\/lib\/firebaseAdmin['"];?/g,
      `import { getAdminDb } from '@/lib/firebaseAdmin';`
    );
  }

  if (content.includes('import { adminAuth, adminDb }')) {
    content = content.replace(
      /import\s*{\s*adminAuth,\s*adminDb\s*}\s*from\s*['"]@\/lib\/firebaseAdmin['"];?/g,
      `import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';`
    );
  }

  // 2. Reemplazar uso directo en funciones
  // Buscar funciones que usan adminAuth
  content = content.replace(
    /(export\s+(?:async\s+)?function\s+\w+[^{]*{[^}]*?)(\s+)(.*?adminAuth\.\w+[^;]*;)/gs,
    (match, funcStart, spaces, authLine) => {
      if (match.includes('const adminAuth = await getAdminAuth()')) {
        return match; // Ya está arreglado
      }
      return funcStart + spaces + 'const adminAuth = await getAdminAuth();\n' + spaces + authLine.replace(/adminAuth/g, 'adminAuth');
    }
  );

  // Buscar funciones que usan adminDb
  content = content.replace(
    /(export\s+(?:async\s+)?function\s+\w+[^{]*{[^}]*?)(\s+)(.*?adminDb\.\w+[^;]*;)/gs,
    (match, funcStart, spaces, dbLine) => {
      if (match.includes('const adminDb = await getAdminDb()')) {
        return match; // Ya está arreglado
      }
      return funcStart + spaces + 'const adminDb = await getAdminDb();\n' + spaces + dbLine.replace(/adminDb/g, 'adminDb');
    }
  );

  // 3. Arreglo específico para métodos de clase
  content = content.replace(
    /(static\s+async\s+\w+[^{]*{[^}]*?)(\s+)(.*?adminAuth\.\w+[^;]*;)/gs,
    (match, methodStart, spaces, authLine) => {
      if (match.includes('const adminAuth = await getAdminAuth()')) {
        return match;
      }
      return methodStart + spaces + 'const adminAuth = await getAdminAuth();\n' + spaces + authLine;
    }
  );

  content = content.replace(
    /(static\s+async\s+\w+[^{]*{[^}]*?)(\s+)(.*?adminDb\.\w+[^;]*;)/gs,
    (match, methodStart, spaces, dbLine) => {
      if (match.includes('const adminDb = await getAdminDb()')) {
        return match;
      }
      return methodStart + spaces + 'const adminDb = await getAdminDb();\n' + spaces + dbLine;
    }
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed: ${filePath}`);
  } else {
    console.log(`⏸️  No changes: ${filePath}`);
  }
}

// Procesar archivos
for (const file of filesToFix) {
  fixFile(file);
}

console.log('\n🚀 Firebase Admin fixes completed!');