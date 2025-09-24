export type BancoRow = {
  id: number;
  fecha?: string;
  descripcion?: string;
  noDoc?: string;
  referencia?: string;
  cargo: number;
  abono: number;
  saldo: number;
  montoFormula: number;
  origen: string;
};

export type ContaRow = {
  id: number;
  fecha?: string;
  nTrans?: string;
  origen?: string;
  numeroOrigen?: string;
  cuenta?: string;
  infoDet?: string;
  cdML: number;
  saldoAcum: number;
};

export type ConcRow = {
  id: number;
  banco: (BancoRow & { montoFormula: number }) | null;
  contabilidad: (ContaRow & { cdML: number }) | null;
  montoBanco: number | null;
  montoConta: number | null;
  diferencia: number | null;
  estado: "conciliado" | "diferencia" | "solo banco" | "solo contabilidad";
  criterio: "id";
};

export type ExportTarget = "conc" | "banco" | "conta" | "todo";
