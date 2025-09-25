import admin from "firebase-admin";

function loadServiceAccountFromB64(b64?: string) {
  if (!b64) return null;
  try {
    const json = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch (e) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_B64 inválida: " + (e as Error).message);
  }
}

function loadServiceAccountFromRaw(raw?: string) {
  if (!raw) return null;
  
  console.log('🔍 Raw input analysis:');
  console.log('  - Length:', raw.length);
  console.log('  - First char code:', raw.charCodeAt(0));
  console.log('  - Second char code:', raw.charCodeAt(1));
  console.log('  - First 50:', raw.substring(0, 50));
  
  // Múltiples estrategias de parsing para manejar diferentes formatos de Vercel
  const strategies = [
    // Estrategia 1: JSON directo
    () => {
      console.log('📝 Trying strategy 1: Direct JSON parse');
      return JSON.parse(raw.trim());
    },
    
    // Estrategia 2: Remover comillas externas y parsear
    () => {
      console.log('📝 Trying strategy 2: Remove outer quotes');
      let cleaned = raw.trim();
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
      }
      return JSON.parse(cleaned);
    },
    
    // Estrategia 3: Unescape simple
    () => {
      console.log('📝 Trying strategy 3: Simple unescape');
      let cleaned = raw.trim()
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
      return JSON.parse(cleaned);
    },
    
    // Estrategia 4: Unescape completo de Vercel
    () => {
      console.log('📝 Trying strategy 4: Full Vercel unescape');
      let cleaned = raw.trim()
        .replace(/\\\\\"/g, '"')      // \\\" -> "
        .replace(/\\\\\\\\/g, '\\\\') // \\\\\\\\ -> \\\\
        .replace(/\\\\n/g, '\\n')     // \\\\n -> \\n 
        .replace(/\\\\r/g, '\\r')     // \\\\r -> \\r
        .replace(/\\\\t/g, '\\t');    // \\\\t -> \\t
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
      }
      cleaned = cleaned.replace(/[\r\n]+$/, '');
      return JSON.parse(cleaned);
    }
  ];
  
  // Intentar cada estrategia
  for (let i = 0; i < strategies.length; i++) {
    try {
      const parsed = strategies[i]();
      
      // Validar que tiene los campos requeridos
      if (parsed && typeof parsed === 'object' && 
          parsed.type && parsed.project_id && parsed.private_key && parsed.client_email) {
        
        // Post-proceso crítico: arreglar la private_key para ASN.1
        if (parsed.private_key && typeof parsed.private_key === 'string') {
          // Asegurarse de que \\n se convierte a \n real
          parsed.private_key = parsed.private_key
            .replace(/\\\\n/g, '\n')  // \\\\n -> \n
            .replace(/\\n/g, '\n')    // \\n -> \n (por si acaso)
            .replace(/\\\\/g, '\\');  // \\\\ -> \\ (otros escapes)
          
          console.log('🔑 Private key fixed for ASN.1');
          console.log('🔑 Key starts with:', parsed.private_key.substring(0, 30));
          console.log('🔑 Key length:', parsed.private_key.length);
          
          // Validar formato básico de la clave
          if (!parsed.private_key.includes('-----BEGIN PRIVATE KEY-----') ||
              !parsed.private_key.includes('-----END PRIVATE KEY-----')) {
            console.log('⚠️ Private key format warning - missing BEGIN/END markers');
          }
        }
        
        console.log(`✅ Strategy ${i + 1} successful!`);
        console.log('✅ Keys found:', Object.keys(parsed));
        return parsed;
      } else {
        console.log(`⚠️ Strategy ${i + 1} parsed but missing required fields`);
      }
    } catch (error) {
      console.log(`❌ Strategy ${i + 1} failed:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  // Si todas fallan, lanzar error detallado
  console.error('🚨 All parsing strategies failed');
  console.error('📝 Raw value for debugging:');
  console.error('  - Char codes (first 20):', Array.from(raw.substring(0, 20)).map(c => c.charCodeAt(0)));
  throw new Error(`FIREBASE_SERVICE_ACCOUNT inválida: todas las estrategias de parsing fallaron`);
}

function loadServiceAccountFromParts() {
  const pid = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (pid && clientEmail && privateKey) {
    return {
      project_id: pid,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };
  }
  return null;
}

function loadServiceAccount() {
  // Priorizar FIREBASE_SERVICE_ACCOUNT (JSON string directo)
  const fromRaw = loadServiceAccountFromRaw(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (fromRaw) return fromRaw;

  const fromB64 = loadServiceAccountFromB64(process.env.FIREBASE_SERVICE_ACCOUNT_B64);
  if (fromB64) return fromB64;

  const fromParts = loadServiceAccountFromParts();
  if (fromParts) return fromParts;

  throw new Error("No se encontró FIREBASE_SERVICE_ACCOUNT, FIREBASE_SERVICE_ACCOUNT_B64 ni vars separadas de admin en .env");
}

// Función para inicializar Firebase Admin de forma lazy
let initPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (admin.apps.length > 0) return;
  
  if (!initPromise) {
    initPromise = (async () => {
      try {
        console.log("Initializing Firebase Admin...");
        
        // Verificar que tenemos las variables necesarias
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        if (!projectId) {
          throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is required");
        }

        const serviceAccount = loadServiceAccount();
        console.log("Service account loaded for project:", serviceAccount.project_id);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as any),
          projectId: projectId,
        });
        console.log("Firebase Admin initialized successfully for project:", projectId);
      } catch (error) {
        console.error("Firebase Admin initialization failed:", error);
        initPromise = null; // Reset para permitir reintentos
        throw error;
      }
    })();
  }
  
  return initPromise;
}

// Funciones seguras que inicializan admin cuando se necesita
export async function getAdminAuth() {
  await ensureInitialized();
  return admin.auth();
}

export async function getAdminDb() {
  await ensureInitialized();
  return admin.firestore();
}

// Para compatibilidad con código existente - pero deprecated
export const adminAuth = null; // Usar getAdminAuth() instead
export const adminDb = null;   // Usar getAdminDb() instead
export default admin;