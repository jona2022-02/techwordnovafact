// lib/verification-codes.ts
// Almacén temporal para códigos de verificación
// En producción, esto debería ser Redis o una base de datos

export interface VerificationCodeData {
  code: string;
  expires: number;
  email: string;
}

// Map global para almacenar códigos
const verificationCodes = new Map<string, VerificationCodeData>();

export function setVerificationCode(uid: string, data: VerificationCodeData) {
  verificationCodes.set(uid, data);
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