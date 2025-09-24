// app/api/contabilidad/davivienda-194/route.ts
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

function parseESNumber(value: any): number {
  if (typeof value === "number") return value;
  const s = String(value ?? "").trim();
  if (!s) return 0;
  const norm = s.replace(/\./g, "").replace(/,/g, ".");
  const n = Number(norm);
  return Number.isFinite(n) ? n : 0;
}

// Extrae número antes de "/" en Info.detallada (columna F)
function extractIdFromInfo(info: any): number {
  const s = String(info ?? "").trim();
  if (!s) return 0;
  const beforeSlash = s.split("/")[0] ?? "";
  const digits = beforeSlash.replace(/\D+/g, "");
  return digits ? Number(digits) : 0;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("fileConta") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Falta el archivo 'fileConta'." }, { status: 400 });
    }

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) {
      return NextResponse.json({ error: "No se encontró hoja." }, { status: 400 });
    }

    // AOA = Array-of-Arrays (filas crudas)
    const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });

    // >>> Datos desde la fila 2 de Excel (0-based => 1)
    const DATA_START = 1;

    // Estructura esperada:
    // A: Fecha (0) | B: N° trans. (1) | C: Origen (2) | D: Número de origen (3)
    // E: Cuenta de co (4) | F: Info.detallada (5) | G: C/D (ML) (6) | H: Saldo acumulado (ML) (7)
    const rawRows = aoa
      .slice(DATA_START)
      .filter(
        (r) =>
          r &&
          r.some(
            (c: any) =>
              c !== undefined && c !== null && String(c).trim() !== ""
          )
      );

    let totalCdML = 0;

    const rows = rawRows.map((r, idx) => {
      const fecha = r[0] ?? "";
      const nTrans = r[1] ?? "";
      const origen = r[2] ?? "";
      const numeroOrigen = r[3] ?? "";
      const cuenta = r[4] ?? "";
      const infoDet = r[5] ?? "";
      const cdML = parseESNumber(r[6]);        // puede venir negativo
      const saldoAcum = parseESNumber(r[7]);

      const id = extractIdFromInfo(infoDet);   // número antes de "/"
      totalCdML += cdML;

      return {
        id,
        fecha,
        nTrans,
        origen,
        numeroOrigen,
        cuenta,
        infoDet,
        cdML,
        saldoAcum,
        // opcional: fila real de Excel (1-based) para debug/traqueo
        filaExcel: DATA_START + idx + 1,
      };
    });

    // Orden por id ascendente
    rows.sort((a, b) => a.id - b.id);

    return NextResponse.json(
      {
        hoja: wb.SheetNames[0],
        count: rows.length,
        totals: { cdML: totalCdML },
        rows,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message ?? "Error procesando contabilidad" },
      { status: 500 }
    );
  }
}
