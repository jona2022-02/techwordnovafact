// app/api/conciliacion/davivienda-194/route.ts
import { NextResponse } from "next/server";

type BancoRow = {
  id: number;
  fecha?: string;
  descripcion?: string;
  noDoc?: string;
  referencia?: string;
  cargo?: number;
  abono?: number;
  saldo?: number;
  montoFormula: number;
  origen?: string;
  [k: string]: any;
};

type ContaRow = {
  id: number;
  fecha?: string;
  nTrans?: string;
  origen?: string;
  numeroOrigen?: string;
  cuenta?: string;
  infoDet?: string;
  cdML: number;
  saldoAcum?: number;
  [k: string]: any;
};

type ConcRow = {
  id: number;
  banco: BancoRow | null;
  contabilidad: ContaRow | null;
  montoBanco: number | null;
  montoConta: number | null;
  diferencia: number | null; // montoBanco - montoConta (2 decimales)
  estado: "conciliado" | "diferencia" | "solo banco" | "solo contabilidad";
  criterio: "id";
};

const ROUND_TO_DECIMALS = 2;
const round = (n: number) =>
  Math.round((n + Number.EPSILON) * Math.pow(10, ROUND_TO_DECIMALS)) /
  Math.pow(10, ROUND_TO_DECIMALS);

export async function POST(req: Request) {
  try {
    const { banco = [], contabilidad = [] } = (await req.json()) as {
      banco: BancoRow[];
      contabilidad: ContaRow[];
    };

    // Ordenamos por id (asc) para salida estable
    banco.sort((a, b) => Number(a.id) - Number(b.id));
    contabilidad.sort((a, b) => Number(a.id) - Number(b.id));

    // Agrupa contabilidad por id y permite múltiples entradas por el mismo id
    const contaById = new Map<number, ContaRow[]>();
    for (const c of contabilidad) {
      const id = Number(c.id);
      const list = contaById.get(id) ?? [];
      list.push(c);
      contaById.set(id, list);
    }

    // Marcar cuáles de contabilidad ya se usaron (para manejar duplicados)
    const usedConta = new WeakSet<ContaRow>();

    const results: ConcRow[] = [];
    let conciliados = 0;
    let conDiferencia = 0;
    let soloBanco = 0;
    let soloConta = 0;

    // 1) Recorre banco y empareja por ID
    for (const b of banco) {
      const id = Number(b.id);
      const candidatos = contaById.get(id) ?? [];
      const match = candidatos.find((c) => !usedConta.has(c)) ?? null;

      if (match) {
        usedConta.add(match);
        const montoBanco = Number(b.montoFormula ?? 0);
        const montoConta = Number(match.cdML ?? 0);
        const diff = round(montoBanco - montoConta);

        const estado: ConcRow["estado"] =
          diff === 0 ? "conciliado" : "diferencia";

        if (estado === "conciliado") conciliados++;
        else conDiferencia++;

        results.push({
          id,
          banco: b,
          contabilidad: match,
          montoBanco,
          montoConta,
          diferencia: diff,
          estado,
          criterio: "id",
        });
      } else {
        soloBanco++;
        results.push({
          id,
          banco: b,
          contabilidad: null,
          montoBanco: Number(b.montoFormula ?? 0),
          montoConta: null,
          diferencia: null,
          estado: "solo banco",
          criterio: "id",
        });
      }
    }

    // 2) Lo que quedó en contabilidad sin pareja
    for (const c of contabilidad) {
      if (!usedConta.has(c)) {
        soloConta++;
        results.push({
          id: Number(c.id),
          banco: null,
          contabilidad: c,
          montoBanco: null,
          montoConta: Number(c.cdML ?? 0),
          diferencia: null,
          estado: "solo contabilidad",
          criterio: "id",
        });
      }
    }

    // 3) Orden final por id ascendente
    results.sort((a, b) => a.id - b.id);

    return NextResponse.json(
      {
        resumen: {
          total: results.length,
          conciliados,
          conDiferencia,
          soloBanco,
          soloContabilidad: soloConta,
        },
        rows: results,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Error en conciliación" },
      { status: 500 }
    );
  }
}
