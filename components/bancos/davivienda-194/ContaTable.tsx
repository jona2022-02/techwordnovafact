"use client";

import type { ContaRow } from "./types";
import Pagination from "./Pagination";

type Props = {
  rows: ContaRow[];
  page: number;
  perPage: number;
  onPageChange: (p: number) => void;
};

export default function ContaTable({ rows, page, perPage, onPageChange }: Props) {
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
              <th>No</th><th>Fecha</th><th>N° trans.</th><th>Origen</th><th>Número de origen</th>
              <th>Cuenta de co</th><th>Info.detallada</th>
              <th className="text-right">C/D (ML)</th><th className="text-right">Saldo acumulado (ML)</th>
            </tr>
          </thead>
          <tbody className="[&>tr>td]:px-2 [&>tr>td]:py-2">
            {slice.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td><td>{r.fecha}</td><td>{r.nTrans}</td><td>{r.origen}</td>
                <td>{r.numeroOrigen}</td><td>{r.cuenta}</td><td>{r.infoDet}</td>
                <td className="text-right">{r.cdML?.toLocaleString("es-SV")}</td>
                <td className="text-right">{r.saldoAcum?.toLocaleString("es-SV")}</td>
              </tr>
            ))}
            {slice.length === 0 && (
              <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">Sin datos de contabilidad aún.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
