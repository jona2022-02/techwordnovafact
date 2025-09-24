'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Activity, Calendar, User, FileText, Clock, CheckCircle, 
  XCircle, Search, Filter, RefreshCw, Download, Eye
} from 'lucide-react'
import { TipoVerificacion } from '@/lib/auditLogService'

type AuditLog = {
  id: string
  userId: string
  userEmail?: string
  tipoVerificacion: TipoVerificacion
  cantidadArchivos: number
  nombreArchivos: string[]
  cantidadResultados: number
  fechaHora: { toDate: () => Date }
  duracionMs: number
  exito: boolean
  errorMessage?: string
  ipAddress?: string
  userAgent?: string
  metadata?: any
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState({
    tipoVerificacion: '',
    exito: '',
    fechaDesde: '',
    fechaHasta: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchLogs = async (resetPage = false) => {
    try {
      setLoading(true)
      const currentPage = resetPage ? 1 : page
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      })
      
      if (filter.tipoVerificacion) params.append('tipoVerificacion', filter.tipoVerificacion)
      if (filter.exito) params.append('exito', filter.exito)
      if (filter.fechaDesde) params.append('fechaDesde', filter.fechaDesde)
      if (filter.fechaHasta) params.append('fechaHasta', filter.fechaHasta)
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/admin/audit-logs?${params}`)
      if (!response.ok) {
        throw new Error('Error al cargar los logs')
      }

      const data = await response.json()
      
      if (resetPage) {
        setLogs(data.logs)
        setPage(1)
      } else {
        setLogs(prev => [...prev, ...data.logs])
      }
      
      setHasMore(data.hasMore)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const handleSearch = () => {
    fetchLogs(true)
  }

  const handleLoadMore = () => {
    setPage(prev => prev + 1)
    setTimeout(() => fetchLogs(), 100)
  }

  const getTipoVerificacionBadge = (tipo: TipoVerificacion) => {
    const colors = {
      CSV: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      JSON: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      CODIGO_FECHA: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    }
    return colors[tipo] || 'bg-gray-100 text-gray-800'
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Logs de Auditoría DTE</h1>
        <p className="text-muted-foreground">
          Registro de todos los procesamientos de documentos tributarios realizados por los usuarios
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Buscar (email/IP)</Label>
              <div className="relative">
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="usuario@email.com"
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div>
              <Label htmlFor="tipo">Tipo Verificación</Label>
              <select
                id="tipo"
                value={filter.tipoVerificacion}
                onChange={(e) => setFilter(prev => ({ ...prev, tipoVerificacion: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="CSV">CSV</option>
                <option value="JSON">JSON</option>
                <option value="CODIGO_FECHA">Código y Fecha</option>
              </select>
            </div>

            <div>
              <Label htmlFor="exito">Estado</Label>
              <select
                id="exito"
                value={filter.exito}
                onChange={(e) => setFilter(prev => ({ ...prev, exito: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="true">Exitoso</option>
                <option value="false">Error</option>
              </select>
            </div>

            <div>
              <Label htmlFor="fechaDesde">Fecha Desde</Label>
              <Input
                id="fechaDesde"
                type="date"
                value={filter.fechaDesde}
                onChange={(e) => setFilter(prev => ({ ...prev, fechaDesde: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="fechaHasta">Fecha Hasta</Label>
              <Input
                id="fechaHasta"
                type="date"
                value={filter.fechaHasta}
                onChange={(e) => setFilter(prev => ({ ...prev, fechaHasta: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setFilter({ tipoVerificacion: '', exito: '', fechaDesde: '', fechaHasta: '' })
                setSearchTerm('')
                fetchLogs(true)
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {logs.length === 0 && !loading && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No se encontraron logs con los filtros aplicados
            </CardContent>
          </Card>
        )}

        {logs.map((log) => (
          <Card key={log.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Status & Type */}
                <div className="lg:col-span-2 space-y-2">
                  <div className="flex items-center gap-2">
                    {log.exito ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${log.exito ? 'text-green-700' : 'text-red-700'}`}>
                      {log.exito ? 'Exitoso' : 'Error'}
                    </span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={getTipoVerificacionBadge(log.tipoVerificacion)}
                  >
                    {log.tipoVerificacion}
                  </Badge>
                </div>

                {/* User Info */}
                <div className="lg:col-span-3">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {log.userEmail || 'Usuario desconocido'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ID: {log.userId.slice(0, 8)}...
                  </div>
                  {log.ipAddress && (
                    <div className="text-xs text-muted-foreground">
                      IP: {log.ipAddress}
                    </div>
                  )}
                </div>

                {/* Processing Info */}
                <div className="lg:col-span-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {log.cantidadArchivos} archivo(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {log.cantidadResultados} resultado(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {formatDuration(log.duracionMs)}
                    </span>
                  </div>
                </div>

                {/* Date & Files */}
                <div className="lg:col-span-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {log.fechaHora.toDate().toLocaleString('es-SV')}
                    </span>
                  </div>
                  {log.nombreArchivos.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Archivos:</div>
                      {log.nombreArchivos.slice(0, 3).map((nombre, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground truncate">
                          {nombre}
                        </div>
                      ))}
                      {log.nombreArchivos.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{log.nombreArchivos.length - 3} más...
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Error or Actions */}
                <div className="lg:col-span-1">
                  {!log.exito && log.errorMessage && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded border">
                      {log.errorMessage}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Load More */}
        {hasMore && !loading && logs.length > 0 && (
          <div className="text-center">
            <Button variant="outline" onClick={handleLoadMore}>
              Cargar más logs
            </Button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <Card>
            <CardContent className="p-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Cargando logs...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}