'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileUp, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  Search, X, Download, RefreshCw, Database, CheckCircle, XCircle, 
  AlertTriangle, FileText, Calendar, DollarSign, ExternalLink, Activity,
  SlidersHorizontal, Hash
} from 'lucide-react'

type Resultado = {
  url: string
  host: string
  ambiente: string
  codGen: string
  fechaEmi: string
  estado: string
  estadoRaw?: string
  descripcionEstado?: string
  tipoDte?: string
  fechaHoraGeneracion?: string
  fechaHoraProcesamiento?: string
  codigoGeneracion?: string
  selloRecepcion?: string
  numeroControl?: string
  montoTotal?: string
  ivaOperaciones?: string
  ivaPercibido?: string
  ivaRetenido?: string
  retencionRenta?: string
  totalNoAfectos?: string
  totalPagarOperacion?: string
  otrosTributos?: string
  documentoAjustado?: string
  error?: string
  linkVisita?: string
  visitar?: string
}

export default function VerificarPorCodigoYFechaPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [data, setData] = useState<Resultado[]>([])
  const [downloadHref, setDownloadHref] = useState<string | null>(null)
  const [filename, setFilename] = useState('resultados_dtes.xlsx')

  // búsqueda, filtros, paginación
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    estado: '',
    tipoDte: '',
    fechaDesde: '',
    fechaHasta: '',
    montoDesde: '',
    montoHasta: '',
    ambiente: '',
    conErrores: false
  })
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const files = inputRef.current?.files
    if (!files || files.length === 0) {
      setMsg('⚠️ Selecciona uno o más archivos .xlsx / .csv / .txt')
      return
    }

    setLoading(true)
    setMsg('⏳ Procesando archivos...')
    setData([])
    setDownloadHref(null)
    setCurrentPage(1)

    try {
      const fd = new FormData()
      Array.from(files).forEach((f) => fd.append('files', f))

      const res = await fetch('/api/verificarcodyfecha', { method: 'POST', body: fd })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Error al procesar los archivos')
      }

      const json = await res.json() as {
        resultados?: Resultado[]
        excelBase64?: string
        downloadUrl?: string
        filename?: string
      }

      setData(json.resultados || [])
      setFilename(json.filename || 'resultados_dtes.xlsx')

      if (json.downloadUrl) {
        setDownloadHref(json.downloadUrl)
      } else if (json.excelBase64) {
        const href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${json.excelBase64}`
        setDownloadHref(href)
      }

      setMsg('✅ Procesamiento finalizado exitosamente')
    } catch (e: any) {
      setMsg(`❌ ${e?.message || 'Error inesperado durante el procesamiento'}`)
    } finally {
      setLoading(false)
    }
  }

  // Función para limpiar filtros
  const clearFilters = () => {
    setFilters({
      estado: '',
      tipoDte: '',
      fechaDesde: '',
      fechaHasta: '',
      montoDesde: '',
      montoHasta: '',
      ambiente: '',
      conErrores: false
    })
    setSearch('')
  }

  // Contar filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (search.trim()) count++
    if (filters.estado) count++
    if (filters.tipoDte) count++
    if (filters.fechaDesde) count++
    if (filters.fechaHasta) count++
    if (filters.montoDesde) count++
    if (filters.montoHasta) count++
    if (filters.ambiente) count++
    if (filters.conErrores) count++
    return count
  }, [search, filters])

  const columnas = useMemo(() => ([
    { key: 'codGen', label: 'Código Generación', icon: Hash },
    { key: 'fechaEmi', label: 'Fecha Emisión', icon: Calendar },
    { key: 'estado', label: 'Estado', icon: Activity },
    { key: 'descripcionEstado', label: 'Descripción', icon: FileText },
    { key: 'tipoDte', label: 'Tipo DTE', icon: FileText },
    { key: 'numeroControl', label: 'N° Control', icon: CheckCircle },
    { key: 'montoTotal', label: 'Monto Total', icon: DollarSign },
    { key: 'error', label: 'Error', icon: AlertTriangle },
    { key: 'visitar', label: 'Acción', icon: ExternalLink },
  ] as const), [])

  // Estadísticas mejoradas
  const stats = useMemo(() => {
    const emitidos = data.filter(r => r.estado === 'EMITIDO').length
    const anulados = data.filter(r => r.estado === 'ANULADO').length
    const rechazados = data.filter(r => r.estado === 'RECHAZADO').length
    const invalidados = data.filter(r => r.estado === 'INVALIDADO').length
    const errores = data.filter(r => r.error && r.error.trim() !== '').length
    const montoTotal = data.reduce((sum, r) => {
      const montoStr = r.montoTotal || '0'
      const monto = parseFloat(montoStr.replace(/[^0-9.-]/g, ''))
      return sum + (isNaN(monto) ? 0 : monto)
    }, 0)
    
    return { emitidos, anulados, rechazados, invalidados, errores, montoTotal, total: data.length }
  }, [data])

  // filtro por búsqueda y filtros avanzados
  const filtered = useMemo(() => {
    let result = data

    // Filtro de búsqueda general
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(r => {
        const campos = [
          r.codGen, r.fechaEmi, r.estado, r.descripcionEstado, r.tipoDte,
          r.numeroControl, r.montoTotal, r.fechaHoraGeneracion,
          r.linkVisita, r.url
        ]
        return campos.some(v => (v || '').toString().toLowerCase().includes(q))
      })
    }

    // Filtros específicos
    if (filters.estado) {
      result = result.filter(r => r.estado === filters.estado)
    }

    if (filters.tipoDte) {
      result = result.filter(r => r.tipoDte === filters.tipoDte)
    }

    if (filters.ambiente) {
      result = result.filter(r => r.ambiente === filters.ambiente)
    }

    // Filtro por fecha
    if (filters.fechaDesde) {
      result = result.filter(r => {
        if (!r.fechaEmi) return false
        return new Date(r.fechaEmi) >= new Date(filters.fechaDesde)
      })
    }

    if (filters.fechaHasta) {
      result = result.filter(r => {
        if (!r.fechaEmi) return false
        return new Date(r.fechaEmi) <= new Date(filters.fechaHasta)
      })
    }

    // Filtro por monto
    if (filters.montoDesde) {
      result = result.filter(r => {
        const montoStr = r.montoTotal || '0'
        const monto = parseFloat(montoStr.replace(/[^0-9.-]/g, ''))
        const filtroMonto = parseFloat(filters.montoDesde)
        return !isNaN(monto) && !isNaN(filtroMonto) && monto >= filtroMonto
      })
    }

    if (filters.montoHasta) {
      result = result.filter(r => {
        const montoStr = r.montoTotal || '0'
        const monto = parseFloat(montoStr.replace(/[^0-9.-]/g, ''))
        const filtroMonto = parseFloat(filters.montoHasta)
        return !isNaN(monto) && !isNaN(filtroMonto) && monto <= filtroMonto
      })
    }

    // Filtro por errores
    if (filters.conErrores) {
      result = result.filter(r => r.error && r.error.trim() !== '')
    }

    return result
  }, [data, search, filters])

  // paginación
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages) }, [filtered.length, rowsPerPage, totalPages, currentPage])
  useEffect(() => { setCurrentPage(1) }, [search, filters])

  // Obtener valores únicos para filtros
  const uniqueValues = useMemo(() => {
    const estados = [...new Set(data.map(r => r.estado).filter(Boolean))].sort()
    const tiposDte = [...new Set(data.map(r => r.tipoDte).filter(Boolean))].sort()
    const ambientes = [...new Set(data.map(r => r.ambiente).filter(Boolean))].sort()
    
    return { estados, tiposDte, ambientes }
  }, [data])

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, currentPage, rowsPerPage])

  const getEstadoBadgeVariant = (estado?: string) => {
    switch (estado?.toUpperCase()) {
      case 'EMITIDO':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700'
      case 'ANULADO':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700'
      case 'RECHAZADO':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700'
      case 'INVALIDADO':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Verificar por Código y Fecha</h1>
        <p className="text-muted-foreground">
          Sube archivos con códigos de generación y fechas para verificar el estado de los documentos tributarios
        </p>
      </div>

      {/* Upload Section */}
      <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5" />
            Cargar Archivos de Códigos y Fechas
          </CardTitle>
          <CardDescription>
            Sube archivos Excel, CSV o TXT que contengan códigos de generación y fechas de documentos tributarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] items-end">
              <div className="space-y-2">
                <Label htmlFor="file" className="text-sm font-medium">
                  Archivos con códigos y fechas
                </Label>
                <div className="relative">
                  <Input 
                    id="file" 
                    ref={inputRef} 
                    type="file" 
                    accept=".xlsx,.xls,.csv,.txt" 
                    multiple 
                    disabled={loading}
                    className="pl-10 h-11"
                  />
                  <FileUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="min-w-[120px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4 mr-2" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Verificar
                    </>
                  )}
                </Button>

                {downloadHref && (
                  <Button asChild variant="outline">
                    <a href={downloadHref} download={filename}>
                      <Download className="w-4 h-4 mr-2" />
                      Descargar Excel
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Format Guide */}
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-medium mb-2">Formato de archivos requerido:</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Columna A (Código):</span>
                  <code className="bg-background px-2 py-0.5 rounded text-xs">
                    UUID del documento (ej: 12345678-ABCD-1234-EFGH-123456789012)
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Columna B (Fecha):</span>
                  <code className="bg-background px-2 py-0.5 rounded text-xs">
                    Fecha de emisión (ej: 2024-01-15)
                  </code>
                </div>
              </div>
            </div>

            {/* Status Message */}
            {msg && (
              <div className={`p-4 rounded-lg border flex items-center gap-2 ${
                msg.startsWith('✅') ? 
                  'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400' :
                msg.startsWith('⏳') ?
                  'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400' :
                  'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400'
              }`}>
                {msg.startsWith('✅') ? <CheckCircle className="w-4 h-4" /> :
                 msg.startsWith('⏳') ? <Loader2 className="w-4 h-4 animate-spin" /> :
                 <XCircle className="w-4 h-4" />}
                <span className="font-medium">{msg}</span>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {data.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-500" />
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-green-600">{stats.emitidos}</p>
                  <p className="text-xs text-muted-foreground">Emitidos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-red-600">{stats.rechazados}</p>
                  <p className="text-xs text-muted-foreground">Rechazados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-yellow-600">{stats.anulados}</p>
                  <p className="text-xs text-muted-foreground">Anulados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-orange-600">{stats.errores}</p>
                  <p className="text-xs text-muted-foreground">Errores</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <div className="space-y-1">
                  <p className="text-lg font-bold text-emerald-600">
                    ${stats.montoTotal.toLocaleString('es-SV', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">Monto Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Table */}
      {data.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Resultados de Verificación
                </CardTitle>
                <CardDescription>
                  {filtered.length} de {data.length} documentos procesados
                </CardDescription>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex flex-1 gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar documentos..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="shrink-0"
                  >
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    Filtros
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>

                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="shrink-0"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Limpiar
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="pageSize" className="text-sm whitespace-nowrap">
                    Mostrar:
                  </Label>
                  <select
                    id="pageSize"
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="h-9 w-20 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    {[10, 20, 50, 100].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Panel de Filtros */}
            {showFilters && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Filtro por Estado */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Estado</Label>
                    <select
                      value={filters.estado}
                      onChange={(e) => setFilters(prev => ({ ...prev, estado: e.target.value }))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">Todos los estados</option>
                      {uniqueValues.estados.map(estado => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Tipo DTE */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tipo DTE</Label>
                    <select
                      value={filters.tipoDte}
                      onChange={(e) => setFilters(prev => ({ ...prev, tipoDte: e.target.value }))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">Todos los tipos</option>
                      {uniqueValues.tiposDte.map(tipo => (
                        <option key={tipo} value={tipo}>
                          {tipo} - {
                            tipo === '01' ? 'Factura' :
                            tipo === '03' ? 'Crédito Fiscal' :
                            tipo === '04' ? 'Nota de Remisión' :
                            tipo === '05' ? 'Nota de Crédito' :
                            tipo === '06' ? 'Nota de Débito' :
                            'Documento'
                          }
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Ambiente */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Ambiente</Label>
                    <select
                      value={filters.ambiente}
                      onChange={(e) => setFilters(prev => ({ ...prev, ambiente: e.target.value }))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">Todos</option>
                      <option value="00">00 - Pruebas</option>
                      <option value="01">01 - Producción</option>
                    </select>
                  </div>

                  {/* Checkbox Solo Errores */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Filtros especiales</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="conErrores"
                        checked={filters.conErrores}
                        onChange={(e) => setFilters(prev => ({ ...prev, conErrores: e.target.checked }))}
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label htmlFor="conErrores" className="text-sm">Solo con errores</Label>
                    </div>
                  </div>

                  {/* Filtro Fecha Desde */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Fecha desde</Label>
                    <Input
                      type="date"
                      value={filters.fechaDesde}
                      onChange={(e) => setFilters(prev => ({ ...prev, fechaDesde: e.target.value }))}
                    />
                  </div>

                  {/* Filtro Fecha Hasta */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Fecha hasta</Label>
                    <Input
                      type="date"
                      value={filters.fechaHasta}
                      onChange={(e) => setFilters(prev => ({ ...prev, fechaHasta: e.target.value }))}
                    />
                  </div>

                  {/* Filtro Monto Desde */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Monto desde</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={filters.montoDesde}
                      onChange={(e) => setFilters(prev => ({ ...prev, montoDesde: e.target.value }))}
                    />
                  </div>

                  {/* Filtro Monto Hasta */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Monto hasta</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={filters.montoHasta}
                      onChange={(e) => setFilters(prev => ({ ...prev, montoHasta: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" onClick={clearFilters} size="sm">
                    <X className="w-4 h-4 mr-1" />
                    Limpiar todos
                  </Button>
                  <Button onClick={() => setShowFilters(false)} size="sm">
                    Aplicar filtros
                  </Button>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      {columnas.map((col) => {
                        const Icon = col.icon
                        return (
                          <th
                            key={col.key}
                            className="text-left p-4 font-medium text-muted-foreground text-xs uppercase tracking-wider"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="w-3 h-3" />
                              {col.label}
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedData.length === 0 ? (
                      <tr>
                        <td colSpan={columnas.length} className="p-8 text-center text-muted-foreground">
                          {loading ? (
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Cargando resultados...
                            </div>
                          ) : (
                            'No se encontraron resultados'
                          )}
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((resultado, index) => (
                        <tr
                          key={resultado.codGen || index}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          {columnas.map((col) => {
                            const valor = (resultado as any)[col.key] || ''
                            
                            return (
                              <td key={col.key} className="p-4 text-sm">
                                {col.key === 'estado' ? (
                                  <Badge 
                                    variant="outline" 
                                    className={getEstadoBadgeVariant(valor)}
                                  >
                                    {valor}
                                  </Badge>
                                ) : col.key === 'visitar' && (resultado.linkVisita || resultado.url) ? (
                                  <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                  >
                                    <a
                                      href={resultado.linkVisita || resultado.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      Ver
                                    </a>
                                  </Button>
                                ) : col.key === 'error' && valor ? (
                                  <div className="text-red-600 dark:text-red-400 text-xs max-w-xs truncate" title={valor}>
                                    {valor}
                                  </div>
                                ) : col.key === 'montoTotal' && valor ? (
                                  <div className="font-mono text-right">
                                    ${(() => {
                                      const montoStr = valor || '0'
                                      const monto = parseFloat(montoStr.replace(/[^0-9.-]/g, ''))
                                      return isNaN(monto) ? '0.00' : monto.toFixed(2)
                                    })()}
                                  </div>
                                ) : (
                                  <div className="max-w-xs truncate" title={valor}>
                                    {valor}
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      Página {currentPage} de {totalPages}
                    </span>
                    <span className="hidden sm:inline">
                      ({((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, filtered.length)} de {filtered.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}