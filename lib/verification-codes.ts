// lib/verification-codes.ts
// Almacén temporal para códigos de verificación
// En producción, esto debería ser Redis o una base de datos

export interface VerificationCodeData {
  code: string;
  expires: number;
  email: string;
  type: 'email-verification' | 'password-reset';
  attempts?: number;
  maxAttempts?: number;
}

// Map global para almacenar códigos
const verificationCodes = new Map<string, VerificationCodeData>();

export function setVerificationCode(uid: string, data: VerificationCodeData) {
  verificationCodes.set(uid, {
    ...data,
    attempts: 0,
    maxAttempts: 5, // Máximo 5 intentos por código
  });
}

export function getVerificationCode(uid: string): VerificationCodeData | undefined {
  return verificationCodes.get(uid);
}

export function deleteVerificationCode(uid: string): boolean {
  return verificationCodes.delete(uid);
}

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
}

// Función para incrementar intentos
export function incrementAttempts(uid: string): boolean {
  const data = verificationCodes.get(uid);
  if (!data) return false;
  
  data.attempts = (data.attempts || 0) + 1;
  verificationCodes.set(uid, data);
  
  return data.attempts <= (data.maxAttempts || 5);
}

// Función para validar código
export function validateVerificationCode(uid: string, inputCode: string): {
  isValid: boolean;
  error?: string;
  data?: VerificationCodeData;
} {
  const data = verificationCodes.get(uid);
  
  if (!data) {
    return { isValid: false, error: 'Código no encontrado o expirado' };
  }
  
  // Verificar si el código ha expirado
  if (Date.now() > data.expires) {
    verificationCodes.delete(uid);
    return { isValid: false, error: 'El código ha expirado' };
  }
  
  // Verificar intentos máximos
  if ((data.attempts || 0) >= (data.maxAttempts || 5)) {
    verificationCodes.delete(uid);
    return { isValid: false, error: 'Demasiados intentos fallidos' };
  }
  
  // Verificar si el código es correcto
  if (data.code !== inputCode.trim()) {
    incrementAttempts(uid);
    const remainingAttempts = (data.maxAttempts || 5) - (data.attempts || 0);
    return { 
      isValid: false, 
      error: `Código incorrecto. Te quedan ${remainingAttempts} intentos` 
    };
  }
  
  // Código válido
  return { isValid: true, data };
}

// Función para limpiar códigos expirados (housekeeping)
export function cleanupExpiredCodes(): number {
  let cleaned = 0;
  const now = Date.now();
  
  for (const [uid, data] of verificationCodes.entries()) {
    if (now > data.expires) {
      verificationCodes.delete(uid);
      cleaned++;
    }
  }
  
  return cleaned;
}

// Función para generar clave única para reset de contraseña
export function generatePasswordResetKey(email: string): string {
  return `pwd_reset_${email}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}