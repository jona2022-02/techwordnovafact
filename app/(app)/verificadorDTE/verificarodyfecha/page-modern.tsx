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
  FileUp, Loader2, Download, Search, Filter, RefreshCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  FileText, Calendar, CheckCircle, XCircle, AlertCircle,
  ExternalLink, Upload, Database, Activity
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

  // búsqueda & paginación
  const [search, setSearch] = useState('')
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

      setMsg('✅ Procesamiento completado exitosamente')
    } catch (e: any) {
      setMsg(`❌ ${e?.message || 'Error inesperado durante el procesamiento'}`)
    } finally {
      setLoading(false)
    }
  }

  const columnas = useMemo(() => ([
    { key: 'codGen', label: 'Código Generación', icon: Database },
    { key: 'fechaEmi', label: 'Fecha Emisión', icon: Calendar },
    { key: 'estado', label: 'Estado', icon: Activity },
    { key: 'descripcionEstado', label: 'Descripción', icon: FileText },
    { key: 'tipoDte', label: 'Tipo DTE', icon: FileText },
    { key: 'numeroControl', label: 'N° Control', icon: CheckCircle },
    { key: 'montoTotal', label: 'Monto Total', icon: Database },
    { key: 'error', label: 'Error', icon: AlertCircle },
    { key: 'visitar', label: 'Acción', icon: ExternalLink },
  ] as const), [])

  // filtro por búsqueda
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter(r => {
      const campos = [
        r.codGen, r.fechaEmi, r.estado, r.descripcionEstado, r.tipoDte,
        r.numeroControl, r.montoTotal, r.linkVisita, r.url
      ]
      return campos.some(v => (v || '').toLowerCase().includes(q))
    })
  }, [data, search])

  // paginación
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [filtered.length, rowsPerPage, totalPages, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, currentPage, rowsPerPage])

  // Estadísticas de resultados
  const stats = useMemo(() => {
    const emitidos = data.filter(r => r.estado === 'EMITIDO').length
    const rechazados = data.filter(r => r.estado === 'RECHAZADO').length
    const anulados = data.filter(r => r.estado === 'ANULADO').length
    const errores = data.filter(r => r.error).length
    
    return { emitidos, rechazados, anulados, errores }
  }, [data])

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
        <h1 className="text-3xl font-bold tracking-tight">Verificador DTE</h1>
        <p className="text-muted-foreground">
          Verificación masiva por código de generación y fecha
        </p>
      </div>

      {/* Upload Section */}
      <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Cargar Archivos
          </CardTitle>
          <CardDescription>
            Sube archivos Excel (.xlsx), CSV (.csv) o TXT (.txt) con los documentos a verificar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] items-end">
              <div className="space-y-2">
                <Label htmlFor="file" className="text-sm font-medium">
                  Archivos de documentos
                </Label>
                <div className="relative">
                  <Input 
                    id="file" 
                    ref={inputRef} 
                    type="file" 
                    accept=".xlsx,.csv,.txt" 
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
              <h4 className="font-medium mb-2">Formato requerido:</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Columna A:</span>
                  <code className="bg-background px-2 py-0.5 rounded text-xs">
                    Código de Generación (UUID)
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Columna B:</span>
                  <code className="bg-background px-2 py-0.5 rounded text-xs">
                    Fecha (YYYY-MM-DD)
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-500" />
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{data.length}</p>
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
                <AlertCircle className="w-4 h-4 text-yellow-500" />
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
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-orange-600">{stats.errores}</p>
                  <p className="text-xs text-muted-foreground">Errores</p>
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
                  {filtered.length} de {data.length} documentos
                </CardDescription>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar documentos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
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
                                    ${parseFloat(valor).toFixed(2)}
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