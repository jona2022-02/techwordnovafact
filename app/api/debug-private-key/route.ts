import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!raw) {
      return NextResponse.json({
        error: 'FIREBASE_SERVICE_ACCOUNT no encontrada'
      });
    }

    // Usar el mismo parsing que firebaseAdmin.ts
    let processed = raw.trim();
    
    // Estrategia 4: Unescape completo de Vercel
    let cleaned = processed
      .replace(/\\\\\"/g, '"')      // \\\" -> "
      .replace(/\\\\\\\\/g, '\\\\') // \\\\\\\\ -> \\\\
      .replace(/\\\\n/g, '\\n')     // \\\\n -> \\n 
      .replace(/\\\\r/g, '\\r')     // \\\\r -> \\r
      .replace(/\\\\t/g, '\\t');    // \\\\t -> \\t
    
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    cleaned = cleaned.replace(/[\r\n]+$/, '');
    
    const parsed = JSON.parse(cleaned);
    
    // Analizar private_key
    if (parsed.private_key) {
      const key = parsed.private_key;
      const keyProcessed = key
        .replace(/\\\\n/g, '\n')  // \\\\n -> \n
        .replace(/\\n/g, '\n')    // \\n -> \n (por si acaso)
        .replace(/\\\\/g, '\\');  // \\\\ -> \\ (otros escapes)

      return NextResponse.json({
        keyLength: key.length,
        keyProcessedLength: keyProcessed.length,
        keyStart: key.substring(0, 100),
        keyProcessedStart: keyProcessed.substring(0, 100),
        keyEnd: key.substring(key.length - 100),
        keyProcessedEnd: keyProcessed.substring(keyProcessed.length - 100),
        hasBeginMarker: keyProcessed.includes('-----BEGIN PRIVATE KEY-----'),
        hasEndMarker: keyProcessed.includes('-----END PRIVATE KEY-----'),
        newlineCount: (keyProcessed.match(/\n/g) || []).length,
        charCodes: Array.from(keyProcessed.substring(0, 50)).map((c) => (c as string).charCodeAt(0))
      });
    }

    return NextResponse.json({
      error: 'No private_key found'
    });

  } catch (error) {
    console.error('Debug private key error:', error);
    return NextResponse.json({
      error: 'Error en debug',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}