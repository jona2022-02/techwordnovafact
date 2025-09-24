'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { auth } from '@/lib/firebase'
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
  AlertTriangle, FileText, Calendar, ExternalLink, Activity,
  SlidersHorizontal, Hash
} from 'lucide-react'
import { CrearProcesoDTO } from '@/types/procesosDte'

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
  const { user, firebaseUser } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)

  // Debug de autenticación
  useEffect(() => {
    console.log('🔐 Estado de autenticación:')
    console.log('- user:', user)
    console.log('- firebaseUser:', firebaseUser)
    console.log('- user?.uid:', user?.uid)
    console.log('- firebaseUser?.uid:', firebaseUser?.uid)
    
    // Probar autenticación cuando el usuario esté listo
    if (user && firebaseUser) {
      testAuthentication();
    }
  }, [user, firebaseUser])

  const testAuthentication = async () => {
    try {
      console.log('🧪 Probando autenticación con el servidor...')
      const token = await firebaseUser?.getIdToken()
      
      if (!token) {
        console.error('❌ No se pudo obtener el token')
        return
      }

      const response = await fetch('/api/test-auth', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Test de autenticación exitoso:', data)
      } else {
        const error = await response.text()
        console.error('❌ Error en test de autenticación:', error)
      }
    } catch (error) {
      console.error('❌ Error al probar autenticación:', error)
    }
  }
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
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
    ambiente: '',
    conErrores: false
  })
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  // handle archivos
  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setSelectedFiles(prev => [...prev, ...files])
    if (inputRef.current) inputRef.current.value = ''
  }
  
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files ?? []).filter(f => {
      const ext = f.name.toLowerCase()
      return ext.endsWith('.xlsx') || ext.endsWith('.csv') || ext.endsWith('.txt')
    })
    if (files.length) setSelectedFiles(prev => [...prev, ...files])
  }
  
  const removeFile = (name: string) => setSelectedFiles(prev => prev.filter(f => f.name !== name))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFiles.length) {
      setMsg('Selecciona uno o más archivos .xlsx / .csv / .txt')
      return
    }

    setLoading(true)
    setMsg('Procesando…')
    setData([])
    setDownloadHref(null)
    setCurrentPage(1)

    const inicioTiempo = Date.now()

    try {
      const fd = new FormData()
      selectedFiles.forEach((f) => fd.append('files', f))

      const res = await fetch('/api/verificarcodyfecha', { method: 'POST', body: fd })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Error al procesar')
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

      // Calcular estadísticas para guardar el proceso
      const duracionMs = Date.now() - inicioTiempo
      const resultados = json.resultados || []
      
      const emitidos = resultados.filter(r => r.estado === 'EMITIDO').length
      const anulados = resultados.filter(r => r.estado === 'ANULADO').length
      const rechazados = resultados.filter(r => r.estado === 'RECHAZADO').length
      const invalidados = resultados.filter(r => r.estado === 'INVALIDADO').length
      const errores = resultados.filter(r => r.error && r.error.trim() !== '').length

      // Guardar el proceso en la base de datos si el usuario está autenticado
      console.log('🔍 Verificando autenticación - user:', !!user, 'firebaseUser:', !!firebaseUser)
      
      if (user && firebaseUser) {
        try {
          console.log('🔑 Obteniendo token de autenticación...')
          const token = await firebaseUser.getIdToken()
          
          const procesoData: any = {
            cantidadArchivos: selectedFiles.length,
            cantidadResultados: resultados.length,
            tipoVerificacion: 'CODIGO_FECHA' as const,
            archivos: selectedFiles.map(f => f.name),
            resultados: {
              emitidos,
              anulados,
              rechazados,
              invalidados,
              errores
            },
            duracionMs,
            exito: true
          }
          
          // No incluir errorMessage para procesos exitosos

          console.log('📤 Enviando datos del proceso:', procesoData)

          const procesoRes = await fetch('/api/procesar-dte', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(procesoData)
          })

          console.log('📥 Respuesta del servidor:', procesoRes.status, procesoRes.statusText)

          if (procesoRes.ok) {
            const responseData = await procesoRes.json()
            console.log('✅ Proceso guardado exitosamente en base de datos:', responseData)
          } else {
            const errorText = await procesoRes.text()
            console.error('❌ Error del servidor al guardar proceso:', errorText)
          }
        } catch (procesoError) {
          console.error('❌ Error al guardar proceso:', procesoError)
        }
      } else {
        console.warn('⚠️ Usuario no autenticado - No se guardará el proceso')
      }

      setMsg('✅ Procesamiento finalizado. Revisa la tabla y descarga el Excel.')
    } catch (e: any) {
      const duracionMs = Date.now() - inicioTiempo

      // Guardar proceso fallido si el usuario está autenticado
      if (user && firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken()
          const procesoData = {
            cantidadArchivos: selectedFiles.length,
            cantidadResultados: 0,
            tipoVerificacion: 'CODIGO_FECHA' as const,
            archivos: selectedFiles.map(f => f.name),
            resultados: {
              emitidos: 0,
              anulados: 0,
              rechazados: 0,
              invalidados: 0,
              errores: 0
            },
            duracionMs,
            exito: false,
            errorMessage: e?.message || 'Error inesperado'
          }

          await fetch('/api/procesar-dte', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(procesoData)
          })
        } catch (procesoError) {
          console.warn('⚠️ Error al guardar proceso fallido:', procesoError)
        }
      }

      setMsg(`❌ ${e?.message || 'Error inesperado'}`)
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
    
    return { emitidos, anulados, rechazados, invalidados, errores, total: data.length }
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
          r.numeroControl, r.fechaHoraGeneracion,
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
            Sube uno o varios archivos <b>Excel/CSV/TXT</b> con <b>Columna A = codGen</b> y <b>Columna B = fecha</b>.
            Verás los resultados y podrás descargar el Excel consolidado.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Formulario */}
          <form onSubmit={onSubmit} className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={onDrop}
              className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 text-center transition-all duration-200
                ${isDragOver ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-muted-foreground/25 hover:border-muted-foreground/50'}`}
            >
              <div className="flex flex-col items-center gap-2">
                <FileUp className={`w-8 h-8 transition-colors ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Arrastra archivos aquí o{' '}
                    <label className="cursor-pointer text-primary underline underline-offset-4 hover:text-primary/80">
                      selecciona archivos
                      <input 
                        ref={inputRef} 
                        className="sr-only" 
                        type="file" 
                        accept=".xlsx,.csv,.txt" 
                        multiple 
                        onChange={onFileInput} 
                        disabled={loading}
                      />
                    </label>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formatos soportados: Excel (.xlsx), CSV, TXT
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de archivos seleccionados */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Archivos seleccionados ({selectedFiles.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map(f => (
                    <Badge key={f.name} variant="outline" className="pl-3 pr-1">
                      <span className="mr-2">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(f.name)}
                        className="rounded-sm hover:bg-muted p-0.5"
                        disabled={loading}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <Button type="submit" disabled={loading || selectedFiles.length === 0}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Verificar Códigos
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

              {/* Status Message */}
              {msg && (
                <div className={`p-3 rounded-lg border flex items-center gap-2 text-sm ${
                  msg.startsWith('✅') ? 
                    'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400' :
                  msg.includes('Procesando') ?
                    'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400' :
                    'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400'
                }`}>
                  {msg.startsWith('✅') ? <CheckCircle className="w-4 h-4" /> :
                   msg.includes('Procesando') ? <Loader2 className="w-4 h-4 animate-spin" /> :
                   <XCircle className="w-4 h-4" />}
                  <span className="font-medium">{msg}</span>
                </div>
              )}
            </div>
          </form>

          {/* Barra de herramientas de tabla */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="hidden sm:inline">Resultados:</span>
                <span className="font-medium text-foreground">{filtered.length}</span>
                {filtered.length !== data.length && (
                  <span className="text-xs">(de {data.length} totales)</span>
                )}
              </div>

              {/* Rows per page */}
              <div className="flex items-center gap-2">
                <Label htmlFor="rpp" className="text-sm">Filas</Label>
                <select
                  id="rpp"
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1) }}
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                >
                  {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, fecha, estado…"
                className="pl-9 w-full sm:max-w-sm"
              />
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Tabla */}
          <div className="rounded-md border overflow-hidden">
            <div className="max-h-[60vh] overflow-auto">
              <div className="min-w-[800px]"> {/* Minimum width for table content */}
                <table className="w-full text-sm">
                <thead className="bg-muted/70 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-muted/50">
                  <tr>
                    {columnas.map(col => (
                      <th
                        key={col.key as string}
                        className="text-left p-2 whitespace-nowrap font-semibold"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan={columnas.length} className="p-6 text-center text-muted-foreground">
                        {loading ? 'Cargando…' : 'Sin resultados para mostrar.'}
                      </td>
                    </tr>
                  )}

                  {paginatedData.map((r, i) => (
                    <tr
                      key={r.codGen || r.url || i}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      {columnas.map(col => {
                        const v = (r as any)[col.key] ?? ''
                        const isEstado = col.key === 'estado'
                        const isVisitar = col.key === 'visitar'
                        return (
                          <td key={col.key as string} className="p-2 align-top whitespace-nowrap">
                            {isEstado ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs border ${getEstadoBadgeVariant(String(v))}`}>
                                {String(v || '')}
                              </span>
                            ) : isVisitar ? (
                              r.linkVisita || r.url ? (
                                <a
                                  href={r.linkVisita || r.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center rounded-md px-2 py-1 border text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                                  title="Abrir en nueva pestaña"
                                >
                                  {r.visitar || 'Abrir'}
                                </a>
                              ) : (
                                ''
                              )
                            ) : (
                              String(v || '')
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginador */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-2 border-t bg-background/60">
              <span className="text-sm text-muted-foreground text-center sm:text-left">
                Página <span className="font-medium text-foreground">{currentPage}</span> de {totalPages}
              </span>

              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Primera</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <span className="hidden sm:inline">Última</span>
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
              </div>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}
