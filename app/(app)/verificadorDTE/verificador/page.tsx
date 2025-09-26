'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileUp, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  Search, X, Link2, Download, RefreshCw, Database, CheckCircle, XCircle, 
  AlertTriangle, FileText, Calendar, ExternalLink, Activity,
  Filter, SlidersHorizontal, Building, Users, Hash
} from 'lucide-react'
import { auth } from '@/lib/firebase'
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

export default function VerificadorPage() {
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
    const files = Array.from(e.dataTransfer.files ?? []).filter(f => f.name.toLowerCase().endsWith('.csv'))
    if (files.length) setSelectedFiles(prev => [...prev, ...files])
  }
  const removeFile = (name: string) => setSelectedFiles(prev => prev.filter(f => f.name !== name))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFiles.length) {
      setMsg('Selecciona o arrastra archivos .csv para procesar.')
      return
    }
    setLoading(true)
    
    // Mensaje más informativo basado en la cantidad de archivos
    const totalSize = selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0)
    const sizeText = totalSize > 1024 * 1024 
      ? `${(totalSize / (1024 * 1024)).toFixed(1)} MB` 
      : `${(totalSize / 1024).toFixed(1)} KB`
    
    if (selectedFiles.length === 1) {
      setMsg(`Procesando archivo: ${selectedFiles[0].name}...`)
    } else if (selectedFiles.length <= 5) {
      setMsg(`Procesando ${selectedFiles.length} archivos (${sizeText})...`)
    } else {
      setMsg(`Procesando ${selectedFiles.length} archivos por lotes optimizado (${sizeText})...`)
    }
    
    setData([])
    setDownloadHref(null)
    setCurrentPage(1)

    const inicioTiempo = Date.now()


    try {
      const fd = new FormData()
      selectedFiles.forEach(f => fd.append('files', f))

      const res = await fetch('/api/procesar', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text() || 'Error al procesar')

      const json = await res.json() as {
        resultados: Resultado[]
        filename?: string
        downloadUrl?: string
        excelBase64?: string
      }

      setData(json.resultados || [])
      setFilename(json.filename || 'resultados_dtes.xlsx')

      if (json.downloadUrl) {
        setDownloadHref(json.downloadUrl)
      } else if (json.excelBase64) {
        const href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${json.excelBase64}`
        setDownloadHref(href)
      } else {
        setDownloadHref(null)
      }

      // Calcular estadísticas para guardar el proceso
      const duracionMs = Date.now() - inicioTiempo
      const resultados = json.resultados || []
      
  const emitidos = resultados.filter(r => r.estado === 'EMITIDO').length
  const anulados = resultados.filter(r => r.estado === 'ANULADO').length
  const rechazados = resultados.filter(r => r.estado === 'RECHAZADO').length
  const invalidados = resultados.filter(r => r.estado === 'INVALIDADO').length
  const desconocidos = resultados.filter(r => r.estado === 'DESCONOCIDO').length
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
            tipoVerificacion: 'CSV' as const,
            archivos: selectedFiles.map(f => f.name),
            resultados: {
              emitidos,
              anulados,
              rechazados,
              invalidados,
              desconocidos,
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

      // Mensaje final mejorado con estadísticas
      const tiempoTotal = ((duracionMs) / 1000).toFixed(1)
      const resumenMsg = selectedFiles.length === 1 
        ? `✅ Procesamiento completado en ${tiempoTotal}s. ${resultados.length} documentos verificados.`
        : selectedFiles.length <= 5
        ? `✅ ${selectedFiles.length} archivos procesados en ${tiempoTotal}s. ${resultados.length} documentos verificados.`
        : `✅ ${selectedFiles.length} archivos procesados por lotes en ${tiempoTotal}s. ${resultados.length} documentos verificados. Emitidos: ${emitidos}, Errores: ${errores}.`
      
      setMsg(resumenMsg)
    } catch (e: any) {
      const duracionMs = Date.now() - inicioTiempo

      // Guardar proceso fallido si el usuario está autenticado
      if (user && firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken()
          const procesoData = {
            cantidadArchivos: selectedFiles.length,
            cantidadResultados: 0,
            tipoVerificacion: 'CSV' as const,
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

  // columnas visibles
  const columnas = useMemo(() => ([
    { key: 'codGen', label: 'Código Generación', icon: Hash },
    { key: 'fechaEmi', label: 'Fecha Emisión', icon: Calendar },
    { key: 'estado', label: 'Estado', icon: Activity },
    { key: 'descripcionEstado', label: 'Descripción', icon: FileText },
    { key: 'tipoDte', label: 'Tipo DTE', icon: FileText },
    { key: 'numeroControl', label: 'N° Control', icon: CheckCircle },
    { key: 'visitar', label: 'Acción', icon: ExternalLink },
    { key: 'error', label: 'Error', icon: AlertTriangle },
  ] as const), [])

  // Estadísticas mejoradas
      const stats = useMemo(() => {
        const emitidos = data.filter(r => r.estado === 'EMITIDO').length
        const anulados = data.filter(r => r.estado === 'ANULADO').length
        const rechazados = data.filter(r => r.estado === 'RECHAZADO').length
        const invalidados = data.filter(r => r.estado === 'INVALIDADO').length
        const desconocidos = data.filter(r => r.estado === 'DESCONOCIDO').length
        const errores = data.filter(r => r.error && r.error.trim() !== '').length
        
        return { emitidos, anulados, rechazados, invalidados, desconocidos, errores, total: data.length }
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
  <div className="container mx-auto p-6 space-y-6 bg-[#eaf3fb] dark:bg-[#181a20] min-h-screen transition-colors">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Verificador DTE por CSV</h1>
        <p className="text-muted-foreground">
          Sube archivos CSV con enlaces de Hacienda y obtén un análisis completo de los documentos tributarios
        </p>
      </div>

      {/* Upload Section */}
      <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5" />
            Cargar Archivos CSV
          </CardTitle>
          <CardDescription>
            Sube archivos CSV que contengan enlaces de documentos tributarios electrónicos de Hacienda
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                    Arrastra archivos CSV aquí o{' '}
                    <label className="cursor-pointer text-primary underline underline-offset-4 hover:text-primary/80">
                      selecciona archivos
                      <input 
                        ref={inputRef}
                        className="sr-only"
                        type="file"
                        accept=".csv"
                        multiple
                        onChange={onFileInput}
                        disabled={loading}
                      />
                    </label>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formato soportado: CSV con enlaces de Hacienda
                  </p>
                </div>
              </div>
            </div>

            {/* Lista mejorada de archivos seleccionados */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Archivos seleccionados ({selectedFiles.length})
                  </h4>
                  {selectedFiles.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFiles([])}
                      disabled={loading}
                      className="h-7 px-2 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Limpiar todo
                    </Button>
                  )}
                </div>

                {/* Vista compacta para pocos archivos */}
                {selectedFiles.length <= 3 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedFiles.map(f => (
                      <Badge key={f.name} variant="outline" className="pl-3 pr-1 max-w-xs">
                        <span className="mr-2 truncate">{f.name}</span>
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
                )}

                {/* Vista detallada para muchos archivos */}
                {selectedFiles.length > 3 && (
                  <div className="border rounded-lg bg-muted/30 divide-y">
                    <div className="p-3">
                      <div className="grid grid-cols-3 gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <div>Archivo</div>
                        <div>Tamaño</div>
                        <div>Acción</div>
                      </div>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      {selectedFiles.map((f, index) => (
                        <div key={f.name} className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                          <div className="grid grid-cols-3 gap-4 flex-1 items-center">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              <span className="text-sm truncate" title={f.name}>
                                {f.name}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {f.size ? (
                                f.size < 1024 ? `${f.size} B` :
                                f.size < 1024 * 1024 ? `${(f.size / 1024).toFixed(1)} KB` :
                                `${(f.size / (1024 * 1024)).toFixed(1)} MB`
                              ) : 'N/A'}
                            </div>
                            <div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(f.name)}
                                disabled={loading}
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-muted/50">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          Total: {selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0) < 1024 * 1024 
                            ? `${(selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0) / 1024).toFixed(1)} KB`
                            : `${(selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0) / (1024 * 1024)).toFixed(1)} MB`
                          }
                        </span>
                        <span>
                          Límite: 150 consultas máximo
                        </span>
                      </div>
                    </div>
                  </div>
                )}
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
                      Verificar DTE
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
        </CardContent>
      </Card>

      {/* Statistics Cards Mejoradas */}
      {data.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-4 mb-6">
          {[
            {label: 'Total procesados', value: stats.total, icon: <Database className="w-4 h-4 text-blue-500" />},
            {label: 'Emitidos', value: stats.emitidos, icon: <CheckCircle className="w-4 h-4 text-green-500" />, color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'},
            {label: 'Rechazados', value: stats.rechazados, icon: <XCircle className="w-4 h-4 text-red-500" />, color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'},
            {label: 'Anulados', value: stats.anulados, icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />, color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'},
            {label: 'Invalidados', value: stats.invalidados, icon: <XCircle className="w-4 h-4 text-purple-500" />, color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'},
            {label: 'Desconocidos', value: stats.desconocidos, icon: <AlertTriangle className="w-4 h-4 text-gray-500" />, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'},
            {label: 'Errores', value: stats.errores, icon: <AlertTriangle className="w-4 h-4 text-orange-500" />, color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'},
          ].map((item, idx) => (
            <div key={item.label} className={`rounded-xl p-4 flex flex-col items-center shadow-sm ${item.color || 'bg-white dark:bg-[#23262f]'}`}>
              <div className="mb-2">{item.icon}</div>
              <div className="text-2xl font-bold">{item.value}</div>
              <div className="text-xs font-medium mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabla de resultados */}
      {data.length > 0 && (
  <Card className="mt-6 bg-[#f0f6fa] dark:bg-[#23262f] border border-[#d2e3ef] dark:border-[#23262f] shadow-sm">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Resultados de la verificación
              </CardTitle>
              <CardDescription>
                Visualiza, filtra y exporta los resultados de los DTE procesados
              </CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 w-48"
                  disabled={data.length === 0}
                />
              </div>
              <Button
                type="button"
                variant={showFilters ? 'default' : 'outline'}
                className={`flex items-center gap-2 rounded-full px-4 py-2 shadow-sm font-semibold transition-colors ${showFilters ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white dark:bg-[#23262f] text-blue-700 dark:text-blue-200 border border-[#d2e3ef] dark:border-[#23262f] hover:bg-blue-50 dark:hover:bg-[#23262f]'}`}
                onClick={() => setShowFilters(v => !v)}
                disabled={data.length === 0}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </div>
            {/* Filtros avanzados */}
            {showFilters && (
              <div className="w-full mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#e3eef7] dark:bg-[#23262f] p-4 rounded-lg border border-[#d2e3ef] dark:border-[#23262f]">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Estado</Label>
                  <select
                    className="w-full border rounded px-2 py-1"
                    value={filters.estado}
                    onChange={e => setFilters(prev => ({ ...prev, estado: e.target.value }))}
                  >
                    <option value="">Todos</option>
                    {uniqueValues.estados.map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tipo DTE</Label>
                  <select
                    className="w-full border rounded px-2 py-1"
                    value={filters.tipoDte}
                    onChange={e => setFilters(prev => ({ ...prev, tipoDte: e.target.value }))}
                  >
                    <option value="">Todos</option>
                    {uniqueValues.tiposDte.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Ambiente</Label>
                  <select
                    className="w-full border rounded px-2 py-1"
                    value={filters.ambiente}
                    onChange={e => setFilters(prev => ({ ...prev, ambiente: e.target.value }))}
                  >
                    <option value="">Todos</option>
                    {uniqueValues.ambientes.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Fecha desde</Label>
                  <Input
                    type="date"
                    value={filters.fechaDesde}
                    onChange={e => setFilters(prev => ({ ...prev, fechaDesde: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Fecha hasta</Label>
                  <Input
                    type="date"
                    value={filters.fechaHasta}
                    onChange={e => setFilters(prev => ({ ...prev, fechaHasta: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="conErrores"
                    checked={filters.conErrores}
                    onChange={e => setFilters(prev => ({ ...prev, conErrores: e.target.checked }))}
                    className="accent-blue-500 dark:accent-blue-400 w-4 h-4 rounded border border-[#b6c6d6] dark:border-[#444b5a] focus:ring-2 focus:ring-blue-400 transition-all"
                  />
                  <Label htmlFor="conErrores" className="text-sm text-[#2a3a4d] dark:text-[#eaf3fb]">Solo con errores</Label>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t col-span-full">
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
                  <thead className="bg-[#eaf3fb] dark:bg-[#23262f]">
                    <tr>
                      {columnas.map(col => {
                        const Icon = col.icon
                        return (
                          <th key={col.key} className="text-left p-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Icon className="w-3 h-3" />
                              {col.label}
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d2e3ef] dark:divide-[#23262f]">
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
                        <tr key={resultado.codGen || index} className="hover:bg-[#e0ecf7] dark:hover:bg-[#23262f] transition-colors">
                          {columnas.map(col => {
                            const valor = (resultado as any)[col.key] || ''
                            return (
                              <td key={col.key} className="p-4 text-sm">
                                {col.key === 'estado' ? (
                                  <Badge variant="outline" className={getEstadoBadgeVariant(valor)}>
                                    {valor}
                                  </Badge>
                                ) : col.key === 'visitar' && (resultado.linkVisita || resultado.url) ? (
                                  <Button asChild variant="outline" size="sm" className="h-8">
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
              {/* Paginación */}
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
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
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
