// app/api/bancos/davivienda-194/route.ts
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

// Convierte "5.059,11" => 5059.11 y números ya numéricos los deja igual.
function parseESNumber(value: any): number {
  if (typeof value === "number") return value;
  const s = String(value ?? "").trim();
  if (!s) return 0;
  const norm = s.replace(/\./g, "").replace(/,/g, ".");
  const n = Number(norm);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("fileBanco") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Falta el archivo 'fileBanco'." }, { status: 400 });
    }

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf); // detecta el tipo automáticamente
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return NextResponse.json({ error: "No se encontró hoja." }, { status: 400 });

    // Matriz (Array-of-Arrays). header:1 -> filas crudas
    const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });

    // Encabezados en fila 5 (index 4). Datos desde la fila 6 (index 5)
    const DATA_START = 4;

    // Columnas esperadas en el banco:
    // A: No. (0) | B: Fecha (1) | C: T.T (2) | D: Descripción (3) | E: No. Doc (4)
    // F: Referencia (5) | G: Cargo (6) | H: Abono (7) | I: Saldo (8)
    const rawRows = aoa.slice(DATA_START).filter((r) => r && r.some((c: any) => c !== undefined && c !== null && String(c).trim() !== ""));

    let totalCargo = 0;
    let totalAbono = 0;
    let totalMontoFormula = 0;

    const rows = rawRows.map((r, i) => {
      const id = Number(r[0] ?? i + 1); // "No."
      const fecha = r[1] ?? "";
      const tt = r[2] ?? "";
      const descripcion = r[3] ?? "";
      const noDoc = r[4] ?? "";
      const referencia = r[5] ?? "";
      const cargo = parseESNumber(r[6]);
      const abono = parseESNumber(r[7]);
      const saldo = parseESNumber(r[8]);

      const montoFormula = abono !== 0 ? abono * -1 : cargo; // =SI(H<>0;H*-1;G)
      const origen = "BANCO";

      totalCargo += cargo;
      totalAbono += abono;
      totalMontoFormula += montoFormula;

      return {
        id, fecha, tt, descripcion, noDoc, referencia,
        cargo, abono, saldo, montoFormula, origen,
      };
    });

    // Orden por id asc
    rows.sort((a, b) => a.id - b.id);

    return NextResponse.json({
      hoja: wb.SheetNames[0],
      count: rows.length,
      totals: { cargo: totalCargo, abono: totalAbono, montoFormula: totalMontoFormula },
      rows,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "Error procesando banco" }, { status: 500 });
  }
}
