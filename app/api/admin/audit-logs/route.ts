// app/api/admin/audit-logs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authenticate, authorize } from '@/lib/apiSecurity'
import { auditLogService, type TipoVerificacion } from '@/lib/auditLogService'

export async function GET(req: NextRequest) {
  try {
    // Autenticar usuario
    const authResult = await authenticate(req)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que sea admin
    const authzResult = await authorize(authResult.user, ['admin'], ['admin:read'])
    if (!authzResult.success) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    // Obtener parámetros de query
    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100
    const tipoVerificacion = searchParams.get('tipoVerificacion') as TipoVerificacion | undefined
    const exitoStr = searchParams.get('exito')
    const exito = exitoStr === 'true' ? true : exitoStr === 'false' ? false : undefined
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    const search = searchParams.get('search')

    // Construir filtros
    const filters: any = {}
    if (tipoVerificacion) filters.tipoVerificacion = tipoVerificacion
    if (exito !== undefined) filters.exito = exito
    if (fechaDesde) filters.fechaDesde = new Date(fechaDesde)
    if (fechaHasta) filters.fechaHasta = new Date(fechaHasta)

    // Obtener logs
    const result = await auditLogService.getAllLogs(page, limit, filters)
    
    // Si hay búsqueda por email o IP, filtrar en memoria (no muy eficiente pero funcional)
    let filteredLogs = result.logs
    if (search && search.trim()) {
      const searchLower = search.toLowerCase()
      filteredLogs = result.logs.filter(log => 
        (log.userEmail && log.userEmail.toLowerCase().includes(searchLower)) ||
        (log.ipAddress && log.ipAddress.includes(search))
      )
    }

    return NextResponse.json({
      logs: filteredLogs,
      total: result.total,
      hasMore: result.hasMore,
      page,
      limit
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    )
  }
}

// Endpoint para estadísticas globales (opcional)
export async function POST(req: NextRequest) {
  try {
    // Autenticar usuario
    const authResult = await authenticate(req)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que sea admin
    const authzResult = await authorize(authResult.user, ['admin'], ['admin:read'])
    if (!authzResult.success) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const body = await req.json()
    const { action } = body

    if (action === 'cleanup') {
      // Limpiar logs antiguos (solo super admin)
      const daysOld = body.daysOld || 90
      const cleaned = await auditLogService.cleanOldLogs(daysOld)
      
      return NextResponse.json({
        success: true,
        message: `Se eliminaron ${cleaned} logs antiguos`
      })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error) {
    console.error('Error in audit logs POST:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    )
  }
}