// app/bancos/davivienda-194/page.tsx
import type { Metadata } from "next";
import Davivienda194Client from "./Davivienda194Client";

export const metadata: Metadata = {
  title: "Davivienda 194 — Banco y Contabilidad",
  description:
    "Importa el estado de cuenta del banco y el libro contable para visualizar y conciliar.",
};

export default function Page() {
  // Este archivo NO lleva "use client"
  return <Davivienda194Client />;
}
