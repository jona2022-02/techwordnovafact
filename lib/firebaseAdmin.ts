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
  try {
    let processed = raw.trim();
    
    console.log('🔍 Original length:', processed.length);
    console.log('🔍 First 100 chars:', processed.substring(0, 100));
    console.log('🔍 Last 100 chars:', processed.substring(processed.length - 100));
    
    // El problema: Vercel está almacenando el JSON con escapes dobles
    // Ejemplo: {\"type\":\"service_account\",\"project_id\":\"...
    // Necesitamos convertir \\\" a \" pero cuidadosamente
    
    // 1. Primero, manejar los escapes dobles específicos de Vercel
    processed = processed
      .replace(/\\\\\"/g, '"')      // \\\" -> " (escape doble de comillas)
      .replace(/\\\\\\\\/g, '\\\\') // \\\\\\\\ -> \\\\ (escape doble de backslash)
      .replace(/\\\\n/g, '\\n')     // \\\\n -> \\n (preservar newlines en JSON)
      .replace(/\\\\r/g, '\\r')     // \\\\r -> \\r (preservar returns)
      .replace(/\\\\t/g, '\\t');    // \\\\t -> \\t (preservar tabs)
    
    console.log('🧹 After unescape, first 100 chars:', processed.substring(0, 100));
    console.log('🧹 After unescape, last 100 chars:', processed.substring(processed.length - 100));
    
    // 2. Limpiar caracteres de control finales si existen
    processed = processed.replace(/[\r\n]+$/, '');
    
    // 3. Validar que se ve como JSON válido
    if (!processed.startsWith('{') || !processed.endsWith('}')) {
      throw new Error('Processed string does not look like JSON object');
    }
    
    // 4. Intentar parsear
    const parsed = JSON.parse(processed);
    console.log('✅ JSON parsed successfully, keys:', Object.keys(parsed));
    
    // 5. Validar campos requeridos
    const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 'client_id'];
    for (const field of requiredFields) {
      if (!parsed[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    console.log('✅ All required fields present');
    console.log('🔑 Private key length:', parsed.private_key?.length);
    
    return parsed;
  } catch (e) {
    console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT:', e);
    console.error('📝 Raw value length:', raw?.length);
    console.error('📝 Raw value sample (first 200):', raw?.substring(0, 200));
    console.error('📝 Raw value sample (around error pos):', raw?.substring(150, 170));
    throw new Error("FIREBASE_SERVICE_ACCOUNT inválida: " + (e as Error).message);
  }
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