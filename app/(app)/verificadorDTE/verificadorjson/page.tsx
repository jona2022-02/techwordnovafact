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
  FileUp, Loader2, Download, Search, Upload, Database, Activity,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  FileText, Calendar, CheckCircle, XCircle, AlertCircle,
  ExternalLink, RefreshCw, Users, Building, Hash, DollarSign,
  Filter, X, CalendarDays, SlidersHorizontal
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { auth } from '@/lib/firebase'
import { CrearProcesoDTO } from '@/types/procesosDte'

type Resultado = {
  // básicos de consulta
  url: string
  host?: string
  ambiente?: string
  codGen: string
  fechaEmi?: string
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
  // 🔽 campos que inyecta el backend desde el JSON
  emisorNit?: string
  emisorNrc?: string
  emisorNombre?: string
  emisorCodActividad?: string
  emisorDescActividad?: string
  emisorNombreComercial?: string
  emisorTelefono?: string
  emisorCorreo?: string

  receptorNit?: string
  receptorNrc?: string
  receptorNombre?: string
  receptorCodActividad?: string
  receptorDescActividad?: string
  receptorDepartamento?: string
  receptorMunicipio?: string
  receptorComplemento?: string
  receptorTelefono?: string
  receptorCorreo?: string
  receptorNombreComercial?: string
}

export default function VerificadorJSONPage() {
  const { user, firebaseUser } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [data, setData] = useState<Resultado[]>([])
  const [downloadHref, setDownloadHref] = useState<string | null>(null)
  const [filename, setFilename] = useState('verificacion_json.xlsx')

  // búsqueda & paginación
  const [search, setSearch] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  // Filtros avanzados
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    estado: '',
    tipoDte: '',
    fechaDesde: '',
    fechaHasta: '',
    montoDesde: '',
    montoHasta: '',
    emisorNit: '',
    receptorNit: '',
    ambiente: '',
    conErrores: false
  })

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
    const files = Array.from(e.dataTransfer.files ?? []).filter(f => f.name.toLowerCase().endsWith('.json'))
    if (files.length) setSelectedFiles(prev => [...prev, ...files])
  }
  
  const removeFile = (name: string) => setSelectedFiles(prev => prev.filter(f => f.name !== name))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFiles.length) {
      setMsg('⚠️ Selecciona uno o más archivos JSON')
      return
    }

    setLoading(true)
    
    // Mensaje más informativo para archivos JSON
    const totalSize = selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0)
    const sizeText = totalSize > 1024 * 1024 
      ? `${(totalSize / (1024 * 1024)).toFixed(1)} MB` 
      : `${(totalSize / 1024).toFixed(1)} KB`
    
    if (selectedFiles.length === 1) {
      setMsg(`⏳ Procesando archivo JSON: ${selectedFiles[0].name}...`)
    } else if (selectedFiles.length <= 5) {
      setMsg(`⏳ Procesando ${selectedFiles.length} archivos JSON (${sizeText})...`)
    } else {
      setMsg(`⏳ Procesando ${selectedFiles.length} archivos JSON por lotes optimizado (${sizeText})...`)
    }
    
    setData([])
    setDownloadHref(null)
    setCurrentPage(1)

    const inicioTiempo = Date.now()

    try {
      const fd = new FormData()
      selectedFiles.forEach((f) => fd.append('files', f))

      const res = await fetch('/api/verificararchjson', { method: 'POST', body: fd })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Error al procesar los archivos JSON')
      }

      const json = await res.json() as {
        resultados: Resultado[]
        filename?: string
        downloadUrl?: string
        excelBase64?: string
      }

      const resultados = json.resultados || []
      setData(resultados)
      setFilename(json.filename || 'verificacion_json.xlsx')

      if (json.downloadUrl) {
        setDownloadHref(json.downloadUrl)
      } else if (json.excelBase64) {
        const href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${json.excelBase64}`
        setDownloadHref(href)
      }

      // Calcular estadísticas del proceso
      const duracionMs = Date.now() - inicioTiempo
      const emitidos = resultados.filter(r => r.estado === 'EMITIDO').length
      const anulados = resultados.filter(r => r.estado === 'ANULADO').length
      const rechazados = resultados.filter(r => r.estado === 'RECHAZADO').length
      const invalidados = resultados.filter(r => r.estado === 'INVALIDADO').length
      const errores = resultados.filter(r => r.error && r.error.trim() !== '').length

      // Guardar el proceso en la base de datos si el usuario está autenticado
      if (user && firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken()
          const procesoData: any = {
            cantidadArchivos: selectedFiles.length,
            cantidadResultados: resultados.length,
            archivos: selectedFiles.map(f => f.name),
            resultados: {
              emitidos,
              anulados,
              rechazados,
              invalidados,
              errores
            },
            duracionMs,
            exito: true,
            tipoVerificacion: 'JSON' as const
          }
          
          // No incluir errorMessage para procesos exitosos

          const saveRes = await fetch('/api/procesar-dte', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(procesoData)
          })

          if (!saveRes.ok) {
            console.error('Error al guardar el proceso en la base de datos:', await saveRes.text())
          } else {
            console.log('✅ Proceso guardado exitosamente en la base de datos')
          }
        } catch (saveError) {
          console.error('Error al guardar el proceso:', saveError)
        }
      }

      // Mensaje final mejorado con estadísticas para JSON
      const tiempoTotal = ((duracionMs) / 1000).toFixed(1)
      const emitidosMsg = resultados.filter(r => r.estado === 'EMITIDO').length
      const erroresMsg = resultados.filter(r => r.error && r.error.trim() !== '').length
      
      const resumenMsg = selectedFiles.length === 1 
        ? `✅ Archivo JSON procesado en ${tiempoTotal}s. ${resultados.length} registros verificados.`
        : selectedFiles.length <= 5
        ? `✅ ${selectedFiles.length} archivos JSON procesados en ${tiempoTotal}s. ${resultados.length} registros verificados.`
        : `✅ ${selectedFiles.length} archivos JSON procesados por lotes en ${tiempoTotal}s. ${resultados.length} registros verificados. Emitidos: ${emitidosMsg}, Errores: ${erroresMsg}.`
      
      setMsg(resumenMsg)
    } catch (e: any) {
      const duracionMs = Date.now() - inicioTiempo
      
      // Guardar proceso fallido en la base de datos si el usuario está autenticado
      if (user && firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken()
          const procesoData: CrearProcesoDTO = {
            cantidadArchivos: selectedFiles.length,
            cantidadResultados: 0,
            archivos: selectedFiles.map(f => f.name),
            resultados: {
              emitidos: 0,
              anulados: 0,
              rechazados: 0,
              invalidados: 0,
              errores: 1,
         
            },
            duracionMs,
            exito: false,
            errorMessage: e?.message || 'Error inesperado durante el procesamiento',
            tipoVerificacion: 'JSON' as const
          }

          await fetch('/api/procesar-dte', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(procesoData)
          })
        } catch (saveError) {
          console.error('Error al guardar el proceso fallido:', saveError)
        }
      }
      
      setMsg(`❌ ${e?.message || 'Error inesperado durante el procesamiento'}`)
    } finally {
      setLoading(false)
    }
  }

  // columnas de la tabla (incluye emisor/receptor)
  const columnas = useMemo(() => ([
    // Identificación / estado
    { key: 'codGen', label: 'Código Generación', icon: Hash, category: 'general' },
    { key: 'fechaEmi', label: 'Fecha Emisión', icon: Calendar, category: 'general' },
    { key: 'estado', label: 'Estado', icon: Activity, category: 'general' },
    { key: 'descripcionEstado', label: 'Descripción', icon: FileText, category: 'general' },
    { key: 'tipoDte', label: 'Tipo DTE', icon: FileText, category: 'general' },
    { key: 'numeroControl', label: 'N° Control', icon: CheckCircle, category: 'general' },

    // Emisor
    { key: 'emisorNit', label: 'Emisor NIT', icon: Building, category: 'emisor' },
    { key: 'emisorNrc', label: 'Emisor NRC', icon: Database, category: 'emisor' },
    { key: 'emisorNombre', label: 'Emisor', icon: Building, category: 'emisor' },
    { key: 'emisorNombreComercial', label: 'Nombre Comercial', icon: Building, category: 'emisor' },
    { key: 'emisorCodActividad', label: 'Código Actividad', icon: Hash, category: 'emisor' },
    { key: 'emisorDescActividad', label: 'Actividad', icon: FileText, category: 'emisor' },
    { key: 'emisorTelefono', label: 'Teléfono', icon: Users, category: 'emisor' },
    { key: 'emisorCorreo', label: 'Correo', icon: Users, category: 'emisor' },

    // Receptor
    { key: 'receptorNit', label: 'Receptor NIT', icon: Users, category: 'receptor' },
    { key: 'receptorNrc', label: 'Receptor NRC', icon: Database, category: 'receptor' },
    { key: 'receptorNombre', label: 'Receptor', icon: Users, category: 'receptor' },
    { key: 'receptorNombreComercial', label: 'Nombre Comercial', icon: Users, category: 'receptor' },
    { key: 'receptorCodActividad', label: 'Código Actividad', icon: Hash, category: 'receptor' },
    { key: 'receptorDescActividad', label: 'Actividad', icon: FileText, category: 'receptor' },
    { key: 'receptorTelefono', label: 'Teléfono', icon: Users, category: 'receptor' },
    { key: 'receptorCorreo', label: 'Correo', icon: Users, category: 'receptor' },
    { key: 'receptorDireccion', label: 'Dirección', icon: Users, category: 'receptor' },

    // Totales / error
    { key: 'montoTotal', label: 'Monto Total', icon: DollarSign, category: 'general' },
    { key: 'error', label: 'Error', icon: AlertCircle, category: 'general' },

    // Link
    { key: 'visitar', label: 'Acción', icon: ExternalLink, category: 'general' },
  ] as const), [])

  // Función para limpiar filtros
  const clearFilters = () => {
    setFilters({
      estado: '',
      tipoDte: '',
      fechaDesde: '',
      fechaHasta: '',
      montoDesde: '',
      montoHasta: '',
      emisorNit: '',
      receptorNit: '',
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
    if (filters.emisorNit) count++
    if (filters.receptorNit) count++
    if (filters.ambiente) count++
    if (filters.conErrores) count++
    return count
  }, [search, filters])

  // filtro de búsqueda y filtros avanzados
  const filtered = useMemo(() => {
    let result = data

    // Filtro de búsqueda general
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(r => {
        const direccion = [r.receptorDepartamento, r.receptorMunicipio, r.receptorComplemento].filter(Boolean).join(' ')
        const campos = [
          r.codGen, r.fechaEmi, r.estado, r.descripcionEstado, r.tipoDte, r.numeroControl, r.montoTotal,
          r.linkVisita, r.url,
          r.emisorNit, r.emisorNrc, r.emisorNombre, r.emisorNombreComercial, r.emisorCodActividad, r.emisorDescActividad, r.emisorTelefono, r.emisorCorreo,
          r.receptorNit, r.receptorNrc, r.receptorNombre, r.receptorNombreComercial, r.receptorCodActividad, r.receptorDescActividad, r.receptorTelefono, r.receptorCorreo, direccion
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

    if (filters.emisorNit) {
      result = result.filter(r => 
        r.emisorNit?.toLowerCase().includes(filters.emisorNit.toLowerCase())
      )
    }

    if (filters.receptorNit) {
      result = result.filter(r => 
        r.receptorNit?.toLowerCase().includes(filters.receptorNit.toLowerCase())
      )
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
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [filtered.length, rowsPerPage, totalPages, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filters])

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, currentPage, rowsPerPage])

  // Obtener valores únicos para filtros
  const uniqueValues = useMemo(() => {
    const estados = [...new Set(data.map(r => r.estado).filter(Boolean))].sort()
    const tiposDte = [...new Set(data.map(r => r.tipoDte).filter(Boolean))].sort()
    const ambientes = [...new Set(data.map(r => r.ambiente).filter(Boolean))].sort()
    
    return { estados, tiposDte, ambientes }
  }, [data])

  // Estadísticas de resultados (basadas en datos filtrados)
  const stats = useMemo(() => {
    const emitidos = filtered.filter(r => r.estado === 'EMITIDO').length
    const rechazados = filtered.filter(r => r.estado === 'RECHAZADO').length
    const anulados = filtered.filter(r => r.estado === 'ANULADO').length
    const invalidados = filtered.filter(r => r.estado === 'INVALIDADO').length
    const errores = filtered.filter(r => r.error).length
    
    return { emitidos, rechazados, anulados, invalidados, errores, total: filtered.length }
  }, [filtered])

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
        <h1 className="text-3xl font-bold tracking-tight">Verificador DTE por JSON</h1>
        <p className="text-muted-foreground">
          Verificación masiva mediante archivos JSON de documentos tributarios
        </p>
      </div>

      {/* Upload Section */}
      <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Cargar Archivos JSON
          </CardTitle>
          <CardDescription>
            Sube archivos JSON que contengan información de documentos tributarios electrónicos
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
                    Arrastra archivos JSON aquí o{' '}
                    <label className="cursor-pointer text-primary underline underline-offset-4 hover:text-primary/80">
                      selecciona archivos
                      <input 
                        ref={inputRef} 
                        className="sr-only" 
                        type="file" 
                        accept=".json,application/json" 
                        multiple 
                        onChange={onFileInput} 
                        disabled={loading}
                      />
                    </label>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formato soportado: JSON con documentos tributarios
                  </p>
                </div>
              </div>
            </div>

            {/* Lista mejorada de archivos JSON seleccionados */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Archivos JSON seleccionados ({selectedFiles.length})
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

                {/* Vista detallada para muchos archivos JSON */}
                {selectedFiles.length > 3 && (
                  <div className="border rounded-lg bg-muted/30 divide-y">
                    <div className="p-3">
                      <div className="grid grid-cols-3 gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <div>Archivo JSON</div>
                        <div>Tamaño</div>
                        <div>Acción</div>
                      </div>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      {selectedFiles.map((f, index) => (
                        <div key={f.name} className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                          <div className="grid grid-cols-3 gap-4 flex-1 items-center">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />
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
                      Verificar JSON
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

            {/* Format Guide */}
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-medium mb-2">Estructura requerida del JSON:</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">identificacion.codigoGeneracion:</span>
                  <code className="bg-background px-2 py-0.5 rounded text-xs">
                    UUID del documento
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">identificacion.fecEmi:</span>
                  <code className="bg-background px-2 py-0.5 rounded text-xs">
                    Fecha de emisión (YYYY-MM-DD)
                  </code>
                </div>
              </div>
            </div>
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
                  <p className="text-2xl font-bold">{data.length}</p>
                  <p className="text-xs text-muted-foreground">Total DTE</p>
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
                  <p className="text-xs text-muted-foreground">
                    Emitidos ({data.length > 0 ? Math.round((stats.emitidos / data.length) * 100) : 0}%)
                  </p>
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
                  <p className="text-xs text-muted-foreground">
                    Rechazados ({data.length > 0 ? Math.round((stats.rechazados / data.length) * 100) : 0}%)
                  </p>
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
                  <p className="text-xs text-muted-foreground">
                    Anulados ({data.length > 0 ? Math.round((stats.anulados / data.length) * 100) : 0}%)
                  </p>
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
                  <p className="text-xs text-muted-foreground">
                    Errores ({data.length > 0 ? Math.round((stats.errores / data.length) * 100) : 0}%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-purple-500" />
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-purple-600">{stats.invalidados}</p>
                  <p className="text-xs text-muted-foreground">Invalidados</p>
                  {stats.total > 0 && (
                    <p className="text-xs text-purple-500">
                      {((stats.invalidados / stats.total) * 100).toFixed(1)}%
                    </p>
                  )}
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
                  Resultados de Verificación JSON
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
                            tipo === '07' ? 'Comprobante Retención' :
                            tipo === '08' ? 'Comprobante Liquidación' :
                            tipo === '09' ? 'Documento Contable Liquidación' :
                            tipo === '11' ? 'Factura de Exportación' :
                            tipo === '14' ? 'Factura Sujeto Excluido' :
                            tipo === '15' ? 'Comprobante Donación' :
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
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={filters.fechaDesde}
                        onChange={(e) => setFilters(prev => ({ ...prev, fechaDesde: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Filtro Fecha Hasta */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Fecha hasta</Label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={filters.fechaHasta}
                        onChange={(e) => setFilters(prev => ({ ...prev, fechaHasta: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Filtro Monto Desde */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Monto desde</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={filters.montoDesde}
                        onChange={(e) => setFilters(prev => ({ ...prev, montoDesde: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Filtro Monto Hasta */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Monto hasta</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={filters.montoHasta}
                        onChange={(e) => setFilters(prev => ({ ...prev, montoHasta: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Filtro NIT Emisor */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">NIT Emisor</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="ej: 12345678-1"
                        value={filters.emisorNit}
                        onChange={(e) => setFilters(prev => ({ ...prev, emisorNit: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Filtro NIT Receptor */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">NIT Receptor</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="ej: 87654321-2"
                        value={filters.receptorNit}
                        onChange={(e) => setFilters(prev => ({ ...prev, receptorNit: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
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
                            const isDireccion = col.key === 'receptorDireccion'
                            const valor = isDireccion
                              ? [resultado.receptorDepartamento, resultado.receptorMunicipio, resultado.receptorComplemento].filter(Boolean).join(' / ')
                              : (resultado as any)[col.key] || ''
                            
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
                                      const monto = parseFloat(valor)
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
