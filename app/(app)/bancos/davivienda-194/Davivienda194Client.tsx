  "use client";

  import { useMemo, useState } from "react";
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Label } from "@/components/ui/label";
  import { Input } from "@/components/ui/input";
  import { Progress } from "@/components/ui/progress";

  // ==== Tipos ====
  type BancoRow = {
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

  type ContaRow = {
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

  type ConcRow = {
    id: number;
    banco: (BancoRow & { montoFormula: number }) | null;
    contabilidad: (ContaRow & { cdML: number }) | null;
    montoBanco: number | null;
    montoConta: number | null;
    diferencia: number | null; // montoBanco - montoConta
    estado: "conciliado" | "diferencia" | "solo banco" | "solo contabilidad";
    criterio: "id";
  };

  type ExportTarget = "conc" | "banco" | "conta" | "todo";

  export default function Davivienda194Client() {
    // Archivos seleccionados
    const [fileBanco, setFileBanco] = useState<File | null>(null);
    const [fileConta, setFileConta] = useState<File | null>(null);

    // Estado de carga / progreso
    const [loadingBanco, setLoadingBanco] = useState(false);
    const [loadingConta, setLoadingConta] = useState(false);
    const [progBanco, setProgBanco] = useState(0);
    const [progConta, setProgConta] = useState(0);

    // Datos procesados
    const [bancoRows, setBancoRows] = useState<BancoRow[]>([]);
    const [contaRows, setContaRows] = useState<ContaRow[]>([]);
    const [concRows, setConcRows] = useState<ConcRow[]>([]);

    // Paginación (10 por página)
    const [pageBanco, setPageBanco] = useState(1);
    const [pageConta, setPageConta] = useState(1);
    const [pageConc, setPageConc] = useState(1);
    const rowsPerPageBanco = 10;
    const rowsPerPageConta = 10;
    const rowsPerPageConc = 10;

    // Control de exportación
    const [exportTarget, setExportTarget] = useState<ExportTarget>("conc");

    // Stats banco
    const bancoStats = useMemo(() => {
      const totalCargo = bancoRows.reduce((a, r) => a + (r.cargo || 0), 0);
      const totalAbono = bancoRows.reduce((a, r) => a + (r.abono || 0), 0);
      const totalMonto = bancoRows.reduce((a, r) => a + (r.montoFormula || 0), 0);
      return { totalCargo, totalAbono, totalMonto };
    }, [bancoRows]);

    // Stats conciliación
    const concStats = useMemo(() => {
      let conciliados = 0, conDiferencia = 0, soloBanco = 0, soloConta = 0;
      concRows.forEach((r) => {
        if (r.estado === "conciliado") conciliados++;
        else if (r.estado === "diferencia") conDiferencia++;
        else if (r.estado === "solo banco") soloBanco++;
        else if (r.estado === "solo contabilidad") soloConta++;
      });
      return { total: concRows.length, conciliados, conDiferencia, soloBanco, soloConta };
    }, [concRows]);

    // Slices de paginación
    const paginatedBanco = useMemo(() => {
      const start = (pageBanco - 1) * rowsPerPageBanco;
      return bancoRows.slice(start, start + rowsPerPageBanco);
    }, [bancoRows, pageBanco]);

    const paginatedConta = useMemo(() => {
      const start = (pageConta - 1) * rowsPerPageConta;
      return contaRows.slice(start, start + rowsPerPageConta);
    }, [contaRows, pageConta]);

    const paginatedConc = useMemo(() => {
      const start = (pageConc - 1) * rowsPerPageConc;
      return concRows.slice(start, start + rowsPerPageConc);
    }, [concRows, pageConc]);

    // ---- Handlers de carga ----
    const handleUploadBanco = async () => {
      if (!fileBanco) return;
      try {
        setLoadingBanco(true);
        setProgBanco(10);
        const fd = new FormData();
        fd.append("fileBanco", fileBanco);
        const res = await fetch("/api/bancos/davivienda-194", { method: "POST", body: fd });
        setProgBanco(70);
        if (!res.ok) throw new Error("Error subiendo archivo de banco");
        const data = await res.json();
        setBancoRows(data.rows || []);
        setPageBanco(1);
        setProgBanco(100);
      } catch (e) {
        console.error(e);
      } finally {
        setTimeout(() => setProgBanco(0), 600);
        setLoadingBanco(false);
      }
    };

    const handleUploadConta = async () => {
      if (!fileConta) return;
      try {
        setLoadingConta(true);
        setProgConta(10);
        const fd = new FormData();
        fd.append("fileConta", fileConta);
        const res = await fetch("/api/contabilidad/davivienda-194", { method: "POST", body: fd });
        setProgConta(70);
        if (!res.ok) throw new Error("Error subiendo archivo de contabilidad");
        const data = await res.json();
        setContaRows(data.rows || []);
        setPageConta(1);
        setProgConta(100);
      } catch (e) {
        console.error(e);
      } finally {
        setTimeout(() => setProgConta(0), 600);
        setLoadingConta(false);
      }
    };

    const handleConciliar = async () => {
      try {
        const res = await fetch("/api/conciliacion/davivienda-194", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ banco: bancoRows, contabilidad: contaRows }),
        });
        if (!res.ok) throw new Error("Error conciliando");
        const data = await res.json();
        setConcRows(data.rows || []);
        setPageConc(1); // reset paginación
      } catch (e) {
        console.error(e);
      }
    };

    const limpiarTablas = () => {
      setBancoRows([]);
      setContaRows([]);
      setConcRows([]);
      setPageBanco(1);
      setPageConta(1);
      setPageConc(1);
    };

    // ---- Helpers export ----
    const dateStamp = () => {
      const d = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
    };

    const mapBancoForSheet = (rows: BancoRow[]) =>
      rows.map(r => ({
        "No": r.id,
        "Fecha": r.fecha ?? "",
        "Descripción": r.descripcion ?? "",
        "No. Doc": r.noDoc ?? "",
        "Referencia": r.referencia ?? "",
        "Cargo": r.cargo ?? 0,
        "Abono": r.abono ?? 0,
        "Saldo": r.saldo ?? 0,
        "Monto Fórmula": r.montoFormula ?? 0,
        "Origen": r.origen ?? ""
      }));

    const mapContaForSheet = (rows: ContaRow[]) =>
      rows.map(r => ({
        "No": r.id,
        "Fecha": r.fecha ?? "",
        "N° trans.": r.nTrans ?? "",
        "Origen": r.origen ?? "",
        "Número de origen": r.numeroOrigen ?? "",
        "Cuenta de co": r.cuenta ?? "",
        "Info.detallada": r.infoDet ?? "",
        "C/D (ML)": r.cdML ?? 0,
        "Saldo acumulado (ML)": r.saldoAcum ?? 0
      }));

    // Orden solicitado para conciliación:
    // id, FechaBanco, DescripciónBanco, Monto FórmulaBanco, Origen,
    // FechaContabilidad, N° trans., Número de origen, Info.detallada, C/D (ML),
    // Monto Banco, Monto Conta, Diferencia, Estado
    const mapConcForSheet = (rows: ConcRow[]) =>
      rows.map(r => ({
        ID: r.id,
        FechaBanco: r.banco?.fecha ?? "",
        "DescripciónBanco": r.banco?.descripcion ?? "",
        "Monto FórmulaBanco": r.banco?.montoFormula ?? r.montoBanco ?? null,
        Origen: r.banco?.origen ?? "",
        FechaContabilidad: r.contabilidad?.fecha ?? "",
        "N° trans.": r.contabilidad?.nTrans ?? "",
        "Número de origen": r.contabilidad?.numeroOrigen ?? "",
        "Info.detallada": r.contabilidad?.infoDet ?? "",
        "C/D (ML)": r.contabilidad?.cdML ?? null,
        "Monto Banco": r.montoBanco ?? r.banco?.montoFormula ?? null,
        "Monto Conta": r.montoConta ?? r.contabilidad?.cdML ?? null,
        Diferencia: r.diferencia ?? null,
        Estado: r.estado,
      }));

    // ---- Exportar a Excel (SheetJS) ----
    const exportExcel = async () => {
      const XLSX = await import("xlsx"); // import dinámico
      const wb = XLSX.utils.book_new();

      const add = (name: string, data: any[]) => {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, name);
      };

      if (exportTarget === "banco" || exportTarget === "todo") add("Banco", mapBancoForSheet(bancoRows));
      if (exportTarget === "conta" || exportTarget === "todo") add("Contabilidad", mapContaForSheet(contaRows));
      if (exportTarget === "conc"  || exportTarget === "todo") add("Conciliacion", mapConcForSheet(concRows));

      const filename =
        exportTarget === "todo"
          ? `Davivienda194_Todo_${dateStamp()}.xlsx`
          : `Davivienda194_${exportTarget.toUpperCase()}_${dateStamp()}.xlsx`;

      XLSX.writeFile(wb, filename, { compression: true });
    };

    // ---- Exportar a PDF (jsPDF + autoTable) ----
    const exportPDF = async () => {
      // import dinámico + any para evitar ts2307 si no tienes @types instalados
      const jsPDFModule: any = await import("jspdf");
      const { jsPDF } = jsPDFModule;
      const autoTableModule: any = await import("jspdf-autotable");
      const autoTable = autoTableModule.default;

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

      let first = true;
      const addTable = (title: string, head: string[], body: (string | number | null)[][]) => {
        if (!first) doc.addPage();
        first = false;
        doc.setFontSize(14);
        doc.text(title, 40, 40);
        autoTable(doc, {
          head: [head],
          body,
          startY: 60,
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: [240, 240, 240] },
          margin: { left: 40, right: 40 }
        });
      };

      if (exportTarget === "banco" || exportTarget === "todo") {
        addTable(
          "Banco — Davivienda 194",
          ["No","Fecha","Descripción","No. Doc","Referencia","Cargo","Abono","Saldo","Monto Fórmula","Origen"],
          bancoRows.map(r => [
            r.id, r.fecha ?? "", r.descripcion ?? "", r.noDoc ?? "", r.referencia ?? "",
            r.cargo ?? 0, r.abono ?? 0, r.saldo ?? 0, r.montoFormula ?? 0, r.origen ?? ""
          ])
        );
      }

      if (exportTarget === "conta" || exportTarget === "todo") {
        addTable(
          "Contabilidad — Davivienda 194",
          ["No","Fecha","N° trans.","Origen","Número de origen","Cuenta de co","Info.detallada","C/D (ML)","Saldo acumulado (ML)"],
          contaRows.map(r => [
            r.id, r.fecha ?? "", r.nTrans ?? "", r.origen ?? "", r.numeroOrigen ?? "",
            r.cuenta ?? "", r.infoDet ?? "", r.cdML ?? 0, r.saldoAcum ?? 0
          ])
        );
      }

      if (exportTarget === "conc" || exportTarget === "todo") {
        addTable(
          "Conciliación — Davivienda 194",
          [
            "ID",
            "FechaBanco",
            "DescripciónBanco",
            "Monto FórmulaBanco",
            "Origen",
            "FechaContabilidad",
            "N° trans.",
            "Número de origen",
            "Info.detallada",
            "C/D (ML)",
            "Monto Banco",
            "Monto Conta",
            "Diferencia",
            "Estado",
          ],
          concRows.map((r) => [
            r.id,
            r.banco?.fecha ?? "",
            r.banco?.descripcion ?? "",
            r.banco?.montoFormula ?? r.montoBanco ?? null,
            r.banco?.origen ?? "",
            r.contabilidad?.fecha ?? "",
            r.contabilidad?.nTrans ?? "",
            r.contabilidad?.numeroOrigen ?? "",
            r.contabilidad?.infoDet ?? "",
            r.contabilidad?.cdML ?? null,
            r.montoBanco ?? r.banco?.montoFormula ?? null,
            r.montoConta ?? r.contabilidad?.cdML ?? null,
            r.diferencia ?? null,
            r.estado,
          ])
        );
      }

      const filename =
        exportTarget === "todo"
          ? `Davivienda194_Todo_${dateStamp()}.pdf`
          : `Davivienda194_${exportTarget.toUpperCase()}_${dateStamp()}.pdf`;

      doc.save(filename);
    };

    // ---- UI ----
    return (
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-4">
        {/* Encabezado */}
        <Card className="shadow-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl">Módulo: Banco Davivienda 194</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Importa el estado de cuenta del banco y el libro contable para visualizar y conciliar.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Carga de archivos */}
        <Card className="shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <h5 className="mb-4 text-lg font-semibold">Importar archivos</h5>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* BANCO */}
              <div className="space-y-3">
                <Label htmlFor="fileBanco" className="text-sm sm:text-base">Estado de cuenta (Banco)</Label>
                <Input
                  id="fileBanco"
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,.xlsm,.xltx,.xltm"
                  onChange={(e) => setFileBanco(e.target.files?.[0] ?? null)}
                  disabled={loadingBanco}
                  className="text-sm"
                />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Se leerá desde la <strong>fila 6</strong>. Se añadirán las columnas
                  <em> Monto Fórmula</em> y <em> Origen</em>.
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Button onClick={handleUploadBanco} disabled={!fileBanco || loadingBanco} className="w-full sm:w-fit">
                    {loadingBanco ? "Cargando…" : "Cargar Banco"}
                  </Button>
                  {progBanco > 0 && <Progress id="progresoBanco" value={progBanco} className="w-full sm:w-40" />}
                </div>
              </div>

              {/* CONTABILIDAD */}
              <div className="space-y-3">
                <Label htmlFor="fileConta" className="text-sm sm:text-base">Libro contable</Label>
                <Input
                  id="fileConta"
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,.xlsm,.xltx,.xltm"
                  onChange={(e) => setFileConta(e.target.files?.[0] ?? null)}
                  disabled={loadingConta}
                  className="text-sm"
                />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Formato esperado (encabezados): <em>Fecha de con</em>, <em>N° trans.</em>, <em>Origen</em>,{" "}
                  <em>Número de origen</em>, <em>Cuenta de co</em>, <em>Info.detallada</em>, <em>C/D (ML)</em>,{" "}
                  <em>Saldo acumulado (ML)</em>.
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={handleUploadConta}
                    disabled={!fileConta || loadingConta}
                    className="w-full sm:w-fit"
                  >
                    {loadingConta ? "Cargando…" : "Cargar Contabilidad"}
                  </Button>
                  {progConta > 0 && <Progress id="progresoConta" value={progConta} className="w-full sm:w-40" />}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Button variant="outline" onClick={limpiarTablas} className="w-full sm:w-fit">
                Limpiar tablas
              </Button>

              {/* Export controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto sm:ml-auto">
                <Label htmlFor="exportTarget" className="text-sm text-muted-foreground whitespace-nowrap">Exportar:</Label>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    id="exportTarget"
                    className="rounded-md border bg-background px-2 py-1 text-sm flex-1 sm:flex-none"
                    value={exportTarget}
                    onChange={(e) => setExportTarget(e.target.value as ExportTarget)}
                  >
                    <option value="conc">Conciliación</option>
                    <option value="banco">Banco</option>
                    <option value="conta">Contabilidad</option>
                    <option value="todo">Todo</option>
                  </select>
                  <Button onClick={exportExcel} variant="outline" size="sm">Excel</Button>
                  <Button onClick={exportPDF} size="sm">PDF</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen Banco */}
        <Card className="shadow-sm">
          <CardContent className="grid gap-4 p-4 sm:p-6 grid-cols-2 sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm">Filas banco:</p>
              <p className="font-semibold text-sm sm:text-base">{bancoRows.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm">Total Cargo:</p>
              <p className="font-semibold text-sm sm:text-base">{bancoStats.totalCargo.toLocaleString("es-SV")}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm">Total Abono:</p>
              <p className="font-semibold text-sm sm:text-base">{bancoStats.totalAbono.toLocaleString("es-SV")}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm">Total Monto Fórmula:</p>
              <p className="font-semibold text-sm sm:text-base">{bancoStats.totalMonto.toLocaleString("es-SV")}</p>
            </div>

            {/* Progreso general */}
            <div className="col-span-2 sm:col-span-4">
              <Label className="mb-2 block text-sm">Progreso de carga</Label>
              <Progress id="progresoCarga" value={Math.max(progBanco, progConta)} />
            </div>
          </CardContent>
        </Card>

        {/* Tabla Banco */}
        <Card className="shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h5 className="text-lg font-semibold">Movimientos Banco</h5>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm text-muted-foreground">
                <span className="whitespace-nowrap">
                  Mostrando {bancoRows.length === 0 ? 0 : (pageBanco - 1) * rowsPerPageBanco + 1}
                  –{Math.min(pageBanco * rowsPerPageBanco, bancoRows.length)} de {bancoRows.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageBanco((p) => Math.max(1, p - 1))}
                    disabled={pageBanco === 1}
                  >
                    Anterior
                  </Button>
                  <span className="whitespace-nowrap">Página {pageBanco}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPageBanco((p) => (p * rowsPerPageBanco < bancoRows.length ? p + 1 : p))
                    }
                    disabled={pageBanco * rowsPerPageBanco >= bancoRows.length}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="[&>th]:py-2 [&>th]:px-2 [&>th]:text-left">
                    <th>No</th>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>No. Doc</th>
                    <th>Referencia</th>
                    <th className="text-right">Cargo</th>
                    <th className="text-right">Abono</th>
                    <th className="text-right">Saldo</th>
                    <th className="text-right">Monto Fórmula</th>
                    <th>Origen</th>
                  </tr>
                </thead>
                <tbody className="[&>tr>td]:px-2 [&>tr>td]:py-2">
                  {paginatedBanco.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.fecha}</td>
                      <td>{r.descripcion}</td>
                      <td>{r.noDoc}</td>
                      <td>{r.referencia}</td>
                      <td className="text-right">{r.cargo?.toLocaleString("es-SV")}</td>
                      <td className="text-right">{r.abono?.toLocaleString("es-SV")}</td>
                      <td className="text-right">{r.saldo?.toLocaleString("es-SV")}</td>
                      <td className="text-right">{r.montoFormula?.toLocaleString("es-SV")}</td>
                      <td>{r.origen}</td>
                    </tr>
                  ))}
                  {paginatedBanco.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-muted-foreground">
                        Sin datos del banco aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla Contabilidad */}
        <Card className="shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h5 className="text-lg font-semibold">Libro Contable</h5>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm text-muted-foreground">
                <span className="whitespace-nowrap">
                  Mostrando {contaRows.length === 0 ? 0 : (pageConta - 1) * rowsPerPageConta + 1}
                  –{Math.min(pageConta * rowsPerPageConta, contaRows.length)} de {contaRows.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageConta((p) => Math.max(1, p - 1))}
                    disabled={pageConta === 1}
                  >
                    Anterior
                  </Button>
                  <span className="whitespace-nowrap">Página {pageConta}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPageConta((p) => (p * rowsPerPageConta < contaRows.length ? p + 1 : p))
                    }
                    disabled={pageConta * rowsPerPageConta >= contaRows.length}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="[&>th]:py-2 [&>th]:px-2 [&>th]:text-left">
                    <th>No</th>
                    <th>Fecha</th>
                    <th>N° trans.</th>
                    <th>Origen</th>
                    <th>Número de origen</th>
                    <th>Cuenta de co</th>
                    <th>Info.detallada</th>
                    <th className="text-right">C/D (ML)</th>
                    <th className="text-right">Saldo acumulado (ML)</th>
                  </tr>
                </thead>
                <tbody className="[&>tr>td]:px-2 [&>tr>td]:py-2">
                  {paginatedConta.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.fecha}</td>
                      <td>{r.nTrans}</td>
                      <td>{r.origen}</td>
                      <td>{r.numeroOrigen}</td>
                      <td>{r.cuenta}</td>
                      <td>{r.infoDet}</td>
                      <td className="text-right">{r.cdML?.toLocaleString("es-SV")}</td>
                      <td className="text-right">{r.saldoAcum?.toLocaleString("es-SV")}</td>
                    </tr>
                  ))}
                  {paginatedConta.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted-foreground">
                        Sin datos de contabilidad aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conciliación */}
        <div className="space-y-4">
          <Button onClick={handleConciliar} className="shadow w-full sm:w-fit">
            Conciliar
          </Button>

          <Card className="shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 text-sm">
                <p>Total registros: <span className="font-semibold">{concStats.total}</span></p>
                <p>Conciliados: <span className="font-semibold">{concStats.conciliados}</span></p>
                <p>Con diferencia: <span className="font-semibold">{concStats.conDiferencia}</span></p>
                <p>Solo en Banco: <span className="font-semibold">{concStats.soloBanco}</span></p>
                <p>Solo en Contabilidad: <span className="font-semibold">{concStats.soloConta}</span></p>
              </div>

              {/* Paginación Conciliación */}
              <div className="mt-4 mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-muted-foreground">
                <span className="whitespace-nowrap">
                  Mostrando {concRows.length === 0 ? 0 : (pageConc - 1) * rowsPerPageConc + 1}
                  –{Math.min(pageConc * rowsPerPageConc, concRows.length)} de {concRows.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageConc((p) => Math.max(1, p - 1))}
                    disabled={pageConc === 1}
                  >
                    Anterior
                  </Button>
                  <span className="whitespace-nowrap">Página {pageConc}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPageConc((p) => (p * rowsPerPageConc < concRows.length ? p + 1 : p))
                    }
                    disabled={pageConc * rowsPerPageConc >= concRows.length}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>

              {/* Tabla de conciliación con el orden solicitado */}
              <div className="overflow-x-auto">
                <div className="min-w-[1200px]">
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
                    {paginatedConc.map((r) => (
                      <tr key={`c-${r.id}-${r.estado}-${r.criterio}`}>
                        <td>{r.id}</td>

                        {/* Banco */}
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

                        {/* Contabilidad */}
                        <td>{r.contabilidad?.fecha ?? "-"}</td>
                        <td>{r.contabilidad?.nTrans ?? "-"}</td>
                        <td>{r.contabilidad?.numeroOrigen ?? "-"}</td>
                        <td>{r.contabilidad?.infoDet ?? "-"}</td>
                        <td className="text-right">
                          {r.contabilidad?.cdML != null
                            ? r.contabilidad.cdML.toLocaleString("es-SV")
                            : "-"}
                        </td>

                        {/* Totales y estado */}
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
                        <td
                          className={
                            r.estado === "conciliado"
                              ? "text-green-600"
                              : r.estado === "diferencia"
                              ? "text-rose-600"
                              : "text-yellow-600"
                          }
                        >
                          {r.estado}
                        </td>
                      </tr>
                    ))}
                    {paginatedConc.length === 0 && (
                      <tr>
                        <td colSpan={14} className="py-8 text-center text-muted-foreground">
                          Aún no has conciliado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
