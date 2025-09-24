"use client";

import type { BancoRow } from "./types";
import Pagination from "./Pagination";

type Props = {
  rows: BancoRow[];
  page: number;
  perPage: number;
  onPageChange: (p: number) => void;
};

export default function BancoTable({ rows, page, perPage, onPageChange }: Props) {
  const start = (page - 1) * perPage;
  const slice = rows.slice(start, start + perPage);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>
          Mostrando {rows.length === 0 ? 0 : start + 1}–{Math.min(page * perPage, rows.length)} de {rows.length}
        </span>
        <Pagination page={page} total={rows.length} perPage={perPage} onPageChange={onPageChange} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="[&>th]:py-2 [&>th]:px-2 [&>th]:text-left">
              <th>No</th><th>Fecha</th><th>Descripción</th><th>No. Doc</th><th>Referencia</th>
              <th className="text-right">Cargo</th><th className="text-right">Abono</th><th className="text-right">Saldo</th>
              <th className="text-right">Monto Fórmula</th><th>Origen</th>
            </tr>
          </thead>
          <tbody className="[&>tr>td]:px-2 [&>tr>td]:py-2">
            {slice.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td><td>{r.fecha}</td><td>{r.descripcion}</td><td>{r.noDoc}</td><td>{r.referencia}</td>
                <td className="text-right">{r.cargo?.toLocaleString("es-SV")}</td>
                <td className="text-right">{r.abono?.toLocaleString("es-SV")}</td>
                <td className="text-right">{r.saldo?.toLocaleString("es-SV")}</td>
                <td className="text-right">{r.montoFormula?.toLocaleString("es-SV")}</td>
                <td>{r.origen}</td>
              </tr>
            ))}
            {slice.length === 0 && (
              <tr><td colSpan={10} className="py-8 text-center text-muted-foreground">Sin datos del banco aún.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
