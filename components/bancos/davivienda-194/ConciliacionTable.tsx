"use client";

import type { ConcRow } from "./types";
import Pagination from "./Pagination";

type Props = {
  rows: ConcRow[];
  page: number;
  perPage: number;
  onPageChange: (p: number) => void;
};

export default function ConciliacionTable({ rows, page, perPage, onPageChange }: Props) {
  const start = (page - 1) * perPage;
  const slice = rows.slice(start, start + perPage);

  return (
    <>
      <div className="mt-4 mb-3 flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>
          Mostrando {rows.length === 0 ? 0 : start + 1}–{Math.min(page * perPage, rows.length)} de {rows.length}
        </span>
        <Pagination page={page} total={rows.length} perPage={perPage} onPageChange={onPageChange} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background">
            <tr className="[&>th]:py-2 [&>th]:px-2 [&>th]:text-left">
              <th>ID</th>
              <th>FechaBanco</th>
              <th>DescripciónBanco</th>
              <th className="text-right">Monto FórmulaBanco</th>
              <th>Origen</th>
              <th>FechaContabilidad</th>
              <th>N° trans.</th>
              <th>Número de origen</th>
              <th>Info.detallada</th>
              <th className="text-right">C/D (ML)</th>
              <th className="text-right">Monto Banco</th>
              <th className="text-right">Monto Conta</th>
              <th className="text-right">Diferencia</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody className="[&>tr>td]:px-2 [&>tr>td]:py-2">
            {slice.map((r) => (
              <tr key={`c-${r.id}-${r.estado}-${r.criterio}`}>
                <td>{r.id}</td>
                <td>{r.banco?.fecha ?? "-"}</td>
                <td>{r.banco?.descripcion ?? "-"}</td>
                <td className="text-right">
                  {r.banco?.montoFormula != null
                    ? r.banco.montoFormula.toLocaleString("es-SV")
                    : r.montoBanco != null
                    ? r.montoBanco.toLocaleString("es-SV")
                    : "-"}
                </td>
                <td>{r.banco?.origen ?? "-"}</td>
                <td>{r.contabilidad?.fecha ?? "-"}</td>
                <td>{r.contabilidad?.nTrans ?? "-"}</td>
                <td>{r.contabilidad?.numeroOrigen ?? "-"}</td>
                <td>{r.contabilidad?.infoDet ?? "-"}</td>
                <td className="text-right">
                  {r.contabilidad?.cdML != null ? r.contabilidad.cdML.toLocaleString("es-SV") : "-"}
                </td>
                <td className="text-right">
                  {r.montoBanco != null
                    ? r.montoBanco.toLocaleString("es-SV")
                    : r.banco?.montoFormula != null
                    ? r.banco.montoFormula.toLocaleString("es-SV")
                    : "-"}
                </td>
                <td className="text-right">
                  {r.montoConta != null
                    ? r.montoConta.toLocaleString("es-SV")
                    : r.contabilidad?.cdML != null
                    ? r.contabilidad.cdML.toLocaleString("es-SV")
                    : "-"}
                </td>
                <td className={`text-right ${r.diferencia === 0 ? "text-muted-foreground" : "text-amber-600"}`}>
                  {r.diferencia != null ? r.diferencia.toLocaleString("es-SV") : "-"}
                </td>
                <td className={r.estado === "conciliado" ? "text-green-600" : r.estado === "diferencia" ? "text-rose-600" : "text-yellow-600"}>
                  {r.estado}
                </td>
              </tr>
            ))}
            {slice.length === 0 && (
              <tr><td colSpan={14} className="py-8 text-center text-muted-foreground">Aún no has conciliado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
