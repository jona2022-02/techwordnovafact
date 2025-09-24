// lib/optimizedAuditService.ts
import { getAdminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/logger';

export type TipoVerificacion = 'CSV' | 'JSON' | 'CODIGO_FECHA';
export type UserRole = 'client' | 'admin' | 'superadmin';

interface BasicAuditEntry {
  userId: string;
  userEmail?: string;
  role: UserRole;
  tipoVerificacion: TipoVerificacion;
  cantidadArchivos: number;
  cantidadResultados: number;
  fechaHora: FirebaseFirestore.Timestamp;
  exito: boolean;
  duracionMs: number;
}

interface DetailedAuditEntry extends BasicAuditEntry {
  nombreArchivos: string[];
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: {
    totalLinks?: number;
    tiposUnicos?: string[];
    estadosUnicos?: string[];
    erroresJSON?: number;
    totalFilas?: number;
  };
}

class OptimizedAuditService {
  private readonly basicLogsCollection = 'audit_logs_basic'; // Para clientes
  private readonly detailedLogsCollection = 'audit_logs_detailed'; // Para admins
  private readonly serviceLogger = logger.service('OptimizedAuditService');

  /**
   * Registra un procesamiento de DTE con nivel de detalle según el rol del usuario
   */
  async logDTEProcessing(data: {
    userId: string;
    userEmail?: string;
    userRole?: UserRole;
    tipoVerificacion: TipoVerificacion;
    cantidadArchivos: number;
    nombreArchivos: string[];
    cantidadResultados: number;
    duracionMs: number;
    exito: boolean;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      const role = data.userRole || 'client';
      const timestamp = new Date() as any;

      // Entrada básica (siempre se guarda)
      const basicEntry: BasicAuditEntry = {
        userId: data.userId,
        userEmail: data.userEmail,
        role,
        tipoVerificacion: data.tipoVerificacion,
        cantidadArchivos: data.cantidadArchivos,
        cantidadResultados: data.cantidadResultados,
        fechaHora: timestamp,
        exito: data.exito,
        duracionMs: data.duracionMs
      };

      // Guardar log básico
      const adminDb = await getAdminDb();
      await adminDb.collection(this.basicLogsCollection).add(basicEntry);

      // Solo guardar detalles completos para admins o errores importantes
      if (role === 'admin' || role === 'superadmin' || !data.exito) {
        const detailedEntry: DetailedAuditEntry = {
          ...basicEntry,
          nombreArchivos: data.nombreArchivos,
          errorMessage: data.errorMessage,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          metadata: data.metadata
        };

        await adminDb.collection(this.detailedLogsCollection).add(detailedEntry);
      }

      this.serviceLogger.info('DTE processing logged successfully', {
        userId: data.userId,
        tipoVerificacion: data.tipoVerificacion,
        role,
        detailed: role === 'admin' || role === 'superadmin' || !data.exito
      });

    } catch (error) {
      this.serviceLogger.error('Failed to log DTE processing', error);
      // No lanzamos error para no afectar el procesamiento principal
    }
  }

  /**
   * Obtiene logs básicos de un usuario (para clientes)
   */
  async getUserBasicLogs(
    userId: string,
    limit: number = 50
  ): Promise<BasicAuditEntry[]> {
    try {
      const adminDb = await getAdminDb();
      const snapshot = await adminDb.collection(this.basicLogsCollection)
        .where('userId', '==', userId)
        .orderBy('fechaHora', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      } as BasicAuditEntry & { id: string }));
    } catch (error) {
      this.serviceLogger.error('Failed to get user basic logs', error);
      return [];
    }
  }

  /**
   * Obtiene estadísticas de un usuario
   */
  async getUserStats(userId: string): Promise<{
    totalProcesos: number;
    procesosExitosos: number;
    procesosFallidos: number;
    totalArchivos: number;
    tiposVerificacion: {
      CSV: number;
      JSON: number;
      CODIGO_FECHA: number;
    };
    ultimoProceso?: Date;
  }> {
    try {
      const adminDb = await getAdminDb();
      const snapshot = await adminDb.collection(this.basicLogsCollection)
        .where('userId', '==', userId)
        .get();

      const logs = snapshot.docs.map((doc: any) => doc.data() as BasicAuditEntry);
      
      const stats = {
        totalProcesos: logs.length,
        procesosExitosos: logs.filter((log: BasicAuditEntry) => log.exito).length,
        procesosFallidos: logs.filter((log: BasicAuditEntry) => !log.exito).length,
        totalArchivos: logs.reduce((sum: number, log: BasicAuditEntry) => sum + log.cantidadArchivos, 0),
        tiposVerificacion: {
          CSV: logs.filter((log: BasicAuditEntry) => log.tipoVerificacion === 'CSV').length,
          JSON: logs.filter((log: BasicAuditEntry) => log.tipoVerificacion === 'JSON').length,
          CODIGO_FECHA: logs.filter((log: BasicAuditEntry) => log.tipoVerificacion === 'CODIGO_FECHA').length,
        },
        ultimoProceso: logs.length > 0 ? (logs[0].fechaHora as any).toDate() : undefined
      };

      return stats;
    } catch (error) {
      this.serviceLogger.error('Failed to get user stats', error);
      return {
        totalProcesos: 0,
        procesosExitosos: 0,
        procesosFallidos: 0,
        totalArchivos: 0,
        tiposVerificacion: { CSV: 0, JSON: 0, CODIGO_FECHA: 0 }
      };
    }
  }

  /**
   * Obtiene logs detallados (solo para admins)
   */
  async getDetailedLogs(
    page: number = 1,
    limit: number = 50,
    filters?: {
      tipoVerificacion?: TipoVerificacion;
      exito?: boolean;
      fechaDesde?: Date;
      fechaHasta?: Date;
      role?: UserRole;
    }
  ): Promise<{
    logs: (DetailedAuditEntry & { id: string })[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const adminDb = await getAdminDb();
      let query: any = adminDb.collection(this.detailedLogsCollection)
        .orderBy('fechaHora', 'desc');

      if (filters?.tipoVerificacion) {
        query = query.where('tipoVerificacion', '==', filters.tipoVerificacion);
      }

      if (filters?.exito !== undefined) {
        query = query.where('exito', '==', filters.exito);
      }

      if (filters?.role) {
        query = query.where('role', '==', filters.role);
      }

      if (filters?.fechaDesde) {
        query = query.where('fechaHora', '>=', filters.fechaDesde);
      }

      if (filters?.fechaHasta) {
        query = query.where('fechaHora', '<=', filters.fechaHasta);
      }

      const offset = (page - 1) * limit;
      const snapshot = await query.limit(limit + 1).offset(offset).get();
      
      const logs = snapshot.docs.slice(0, limit).map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      } as DetailedAuditEntry & { id: string }));

      const hasMore = snapshot.docs.length > limit;
      const total = await this.getTotalCount(this.detailedLogsCollection, filters);

      return { logs, total, hasMore };
    } catch (error) {
      this.serviceLogger.error('Failed to get detailed logs', error);
      return { logs: [], total: 0, hasMore: false };
    }
  }

  /**
   * Obtiene resumen diario de actividad (para dashboard de admins)
   */
  async getDailyActivitySummary(days: number = 7): Promise<{
    date: string;
    totalProcesses: number;
    successfulProcesses: number;
    failedProcesses: number;
    uniqueUsers: number;
    totalFiles: number;
  }[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const adminDb = await getAdminDb();
      const snapshot = await adminDb.collection(this.basicLogsCollection)
        .where('fechaHora', '>=', startDate)
        .where('fechaHora', '<=', endDate)
        .get();

      const logs = snapshot.docs.map((doc: any) => doc.data() as BasicAuditEntry);
      
      // Agrupar por día
      const dailyStats = new Map<string, {
        totalProcesses: number;
        successfulProcesses: number;
        failedProcesses: number;
        uniqueUsers: Set<string>;
        totalFiles: number;
      }>();

      logs.forEach(log => {
        const date = (log.fechaHora as any).toDate().toISOString().split('T')[0];
        
        if (!dailyStats.has(date)) {
          dailyStats.set(date, {
            totalProcesses: 0,
            successfulProcesses: 0,
            failedProcesses: 0,
            uniqueUsers: new Set<string>(),
            totalFiles: 0
          });
        }

        const dayStats = dailyStats.get(date)!;
        dayStats.totalProcesses++;
        dayStats.totalFiles += log.cantidadArchivos;
        dayStats.uniqueUsers.add(log.userId);
        
        if (log.exito) {
          dayStats.successfulProcesses++;
        } else {
          dayStats.failedProcesses++;
        }
      });

      // Convertir a array
      return Array.from(dailyStats.entries()).map(([date, stats]) => ({
        date,
        totalProcesses: stats.totalProcesses,
        successfulProcesses: stats.successfulProcesses,
        failedProcesses: stats.failedProcesses,
        uniqueUsers: stats.uniqueUsers.size,
        totalFiles: stats.totalFiles
      })).sort((a, b) => a.date.localeCompare(b.date));

    } catch (error) {
      this.serviceLogger.error('Failed to get daily activity summary', error);
      return [];
    }
  }

  /**
   * Obtiene resumen de actividad de todos los usuarios (para admin)
   */
  async getUsersActivitySummary(): Promise<{
    userId: string;
    totalProcesos: number;
    procesosExitosos: number;
    ultimoProceso?: Date;
  }[]> {
    try {
      const adminDb = await getAdminDb();
      const snapshot = await adminDb.collection(this.basicLogsCollection)
        .orderBy('fechaHora', 'desc')
        .get();

      const logs = snapshot.docs.map((doc: any) => doc.data() as BasicAuditEntry);
      
      // Agrupar por usuario
      const userStats = new Map<string, {
        totalProcesos: number;
        procesosExitosos: number;
        ultimoProceso?: Date;
      }>();

      logs.forEach(log => {
        const userId = log.userId;
        
        if (!userStats.has(userId)) {
          userStats.set(userId, {
            totalProcesos: 0,
            procesosExitosos: 0,
            ultimoProceso: undefined
          });
        }

        const stats = userStats.get(userId)!;
        stats.totalProcesos++;
        
        if (log.exito) {
          stats.procesosExitosos++;
        }

        const logDate = (log.fechaHora as any).toDate();
        if (!stats.ultimoProceso || logDate > stats.ultimoProceso) {
          stats.ultimoProceso = logDate;
        }
      });

      // Convertir a array y filtrar usuarios con actividad
      return Array.from(userStats.entries())
        .filter(([_, stats]) => stats.totalProcesos > 0)
        .map(([userId, stats]) => ({
          userId,
          totalProcesos: stats.totalProcesos,
          procesosExitosos: stats.procesosExitosos,
          ultimoProceso: stats.ultimoProceso
        }))
        .sort((a, b) => b.totalProcesos - a.totalProcesos); // Ordenar por actividad

    } catch (error) {
      this.serviceLogger.error('Failed to get users activity summary', error);
      return [];
    }
  }

  /**
   * Limpia logs antiguos manteniendo solo estadísticas básicas
   */
  async cleanOldLogs(daysOld: number = 90): Promise<{ basic: number; detailed: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const adminDb = await getAdminDb();
      
      // Limpiar logs detallados (más agresivo)
      const detailedSnapshot = await adminDb.collection(this.detailedLogsCollection)
        .where('fechaHora', '<', cutoffDate)
        .limit(500)
        .get();

      // Limpiar logs básicos (menos agresivo, mantener más tiempo)
      const oldBasicDate = new Date();
      oldBasicDate.setDate(oldBasicDate.getDate() - (daysOld * 2)); // El doble de tiempo

      const basicSnapshot = await adminDb.collection(this.basicLogsCollection)
        .where('fechaHora', '<', oldBasicDate)
        .limit(500)
        .get();

      const batch = adminDb.batch();
      
      detailedSnapshot.docs.forEach((doc: any) => batch.delete(doc.ref));
      basicSnapshot.docs.forEach((doc: any) => batch.delete(doc.ref));
      
      await batch.commit();
      
      this.serviceLogger.info(`Cleaned audit logs`, {
        detailed: detailedSnapshot.docs.length,
        basic: basicSnapshot.docs.length
      });

      return {
        detailed: detailedSnapshot.docs.length,
        basic: basicSnapshot.docs.length
      };
    } catch (error) {
      this.serviceLogger.error('Failed to clean old logs', error);
      return { detailed: 0, basic: 0 };
    }
  }

  private async getTotalCount(collection: string, filters?: any): Promise<number> {
    try {
      const adminDb = await getAdminDb();
      let query: any = adminDb.collection(collection);

      if (filters?.tipoVerificacion) {
        query = query.where('tipoVerificacion', '==', filters.tipoVerificacion);
      }

      if (filters?.exito !== undefined) {
        query = query.where('exito', '==', filters.exito);
      }

      if (filters?.role) {
        query = query.where('role', '==', filters.role);
      }

      const snapshot = await query.count().get();
      return snapshot.data().count;
    } catch (error) {
      this.serviceLogger.error('Failed to get total count', error);
      return 0;
    }
  }
}

export const optimizedAuditService = new OptimizedAuditService();
export default optimizedAuditService;