const fs = require('fs');

// Leer el archivo userService.ts
const filePath = 'lib/userService.ts';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔄 Fixing UserService.ts...\n');

// 1. Encontrar todas las funciones que usan adminAuth o adminDb
const functions = [];
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Detectar inicio de métodos static async
  if (line.match(/static async \w+\(/)) {
    const functionName = line.match(/static async (\w+)\(/)[1];
    functions.push({
      name: functionName,
      startLine: i,
      usesAuth: false,
      usesDb: false
    });
  }
}

// 2. Analizar qué funciones usan adminAuth y adminDb
for (let func of functions) {
  const funcLines = [];
  let braceCount = 0;
  let inFunction = false;
  
  for (let i = func.startLine; i < lines.length; i++) {
    const line = lines[i];
    funcLines.push(line);
    
    if (line.includes('{')) {
      braceCount += (line.match(/\{/g) || []).length;
      inFunction = true;
    }
    if (line.includes('}')) {
      braceCount -= (line.match(/\}/g) || []).length;
    }
    
    if (inFunction && braceCount === 0) {
      func.endLine = i;
      break;
    }
    
    if (line.includes('adminAuth')) func.usesAuth = true;
    if (line.includes('adminDb')) func.usesDb = true;
  }
}

console.log('📊 Functions analysis:');
functions.forEach(func => {
  console.log(`  ${func.name}: auth=${func.usesAuth}, db=${func.usesDb}`);
});

// 3. Aplicar transformaciones
let result = content;

// Reemplazar todas las ocurrencias de adminAuth y adminDb con versiones async
const transforms = [
  {
    pattern: /(\s+)(const \w+ = )?await adminAuth\./g,
    replacement: (match, spaces, varDecl) => {
      if (varDecl) {
        return `${spaces}const adminAuth = await getAdminAuth();\n${spaces}${varDecl}await adminAuth.`;
      } else {
        return `${spaces}const adminAuth = await getAdminAuth();\n${spaces}await adminAuth.`;
      }
    }
  },
  {
    pattern: /(\s+)(const \w+ = )?await adminDb\./g,
    replacement: (match, spaces, varDecl) => {
      if (varDecl) {
        return `${spaces}const adminDb = await getAdminDb();\n${spaces}${varDecl}await adminDb.`;
      } else {
        return `${spaces}const adminDb = await getAdminDb();\n${spaces}await adminDb.`;
      }
    }
  }
];

for (let transform of transforms) {
  result = result.replace(transform.pattern, transform.replacement);
}

// 4. Arreglar tipos para forEach
result = result.replace(/querySnapshot\.forEach\(\(doc\) => \{/g, 'querySnapshot.forEach((doc: any) => {');

// 5. Escribir el resultado
fs.writeFileSync(filePath, result);

console.log('\n✅ UserService.ts fixed successfully!');
console.log('🚀 Ready to test and deploy.');