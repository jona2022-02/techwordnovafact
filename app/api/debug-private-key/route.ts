import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!raw) {
      return NextResponse.json({
        error: 'FIREBASE_SERVICE_ACCOUNT no encontrada'
      });
    }

    console.log('🔍 Raw input analysis:');
    console.log('  - Length:', raw.length);
    console.log('  - First char code:', raw.charCodeAt(0));
    console.log('  - Second char code:', raw.charCodeAt(1));
    console.log('  - First 50:', raw.substring(0, 50));

    // Usar EXACTAMENTE las mismas estrategias que firebaseAdmin.ts
    const strategies = [
      // Estrategia 1: JSON directo
      () => {
        return JSON.parse(raw.trim());
      },
      
      // Estrategia 2: Remover comillas externas y parsear
      () => {
        let cleaned = raw.trim();
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
          cleaned = cleaned.slice(1, -1);
        }
        return JSON.parse(cleaned);
      },
      
      // Estrategia 3: Unescape simple
      () => {
        let cleaned = raw.trim()
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
        return JSON.parse(cleaned);
      },
      
      // Estrategia 4: Unescape completo de Vercel
      () => {
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
          
          // Analizar private_key
          const key = parsed.private_key;
          const keyProcessed = key
            .replace(/\\\\n/g, '\n')  // \\\\n -> \n
            .replace(/\\n/g, '\n')    // \\n -> \n (por si acaso)
            .replace(/\\\\/g, '\\');  // \\\\ -> \\ (otros escapes)

          return NextResponse.json({
            successfulStrategy: i + 1,
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
      } catch (error) {
        console.log(`Strategy ${i + 1} failed:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return NextResponse.json({
      error: 'All strategies failed'
    });

  } catch (error) {
    console.error('Debug private key error:', error);
    return NextResponse.json({
      error: 'Error en debug',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}