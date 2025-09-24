"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ExportTarget } from "./types";

type Props = {
  value: ExportTarget;
  onChange: (v: ExportTarget) => void;
  onExcel: () => void;
  onPDF: () => void;
};

export default function ExportControls({ value, onChange, onExcel, onPDF }: Props) {
  return (
    <div className="ml-auto flex items-center gap-2">
      <Label htmlFor="exportTarget" className="text-sm text-muted-foreground">Exportar:</Label>
      <select
        id="exportTarget"
        className="rounded-md border bg-background px-2 py-1 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value as ExportTarget)}
      >
        <option value="conc">Conciliación</option>
        <option value="banco">Banco</option>
        <option value="conta">Contabilidad</option>
        <option value="todo">Todo</option>
      </select>
      <Button onClick={onExcel} variant="outline">Excel</Button>
      <Button onClick={onPDF}>PDF</Button>
    </div>
  );
}
