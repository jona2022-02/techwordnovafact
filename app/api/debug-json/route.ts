import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!raw) {
      return NextResponse.json({
        error: 'FIREBASE_SERVICE_ACCOUNT no encontrada'
      });
    }

    // Analizar caracteres alrededor de la posición problemática (158)
    const start = Math.max(0, 150);
    const end = Math.min(raw.length, 170);
    const problematicSection = raw.substring(start, end);
    
    // Crear análisis detallado de cada carácter
    const charAnalysis = [];
    for (let i = start; i < end; i++) {
      const char = raw[i];
      const code = char.charCodeAt(0);
      charAnalysis.push({
        position: i,
        char: char,
        charCode: code,
        isControl: code < 32,
        isEscape: char === '\\',
        display: code < 32 ? `[CTRL-${code}]` : char
      });
    }

    return NextResponse.json({
      totalLength: raw.length,
      problematicSection: problematicSection,
      charAnalysis: charAnalysis,
      firstChar: raw[0],
      lastChar: raw[raw.length - 1],
      starts: raw.substring(0, 50),
      ends: raw.substring(raw.length - 50)
    });

  } catch (error) {
    console.error('Debug JSON error:', error);
    return NextResponse.json({
      error: 'Error en debug',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}