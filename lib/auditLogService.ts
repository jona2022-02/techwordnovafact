// lib/auditLogService.ts
import { getAdminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/logger';

export type TipoVerificacion = 'CSV' | 'JSON' | 'CODIGO_FECHA';

interface AuditLogEntry {
  userId: string;
  userEmail?: string;
  tipoVerificacion: TipoVerificacion;
  cantidadArchivos: number;
  nombreArchivos: string[];
  cantidadResultados: number;
  fechaHora: FirebaseFirestore.Timestamp;
  duracionMs: number;
  exito: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: {
    [key: string]: any;
  };
}

class AuditLogService {
  private readonly collectionName = 'audit_logs_dte';
  private readonly serviceLogger = logger.service('AuditLogService');

  /**
   * Registra un procesamiento de DTE
   */
  async logDTEProcessing(data: {
    userId: string;
    userEmail?: string;
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
      const logEntry: AuditLogEntry = {
        ...data,
        fechaHora: new Date() as any, // Firestore lo convertirá automáticamente
      };

      const adminDb = await getAdminDb();
      await adminDb.collection(this.collectionName).add(logEntry);
      
      this.serviceLogger.info('DTE processing logged successfully', {
        userId: data.userId,
        tipoVerificacion: data.tipoVerificacion,
        cantidadArchivos: data.cantidadArchivos,
        exito: data.exito
      });
    } catch (error) {
      this.serviceLogger.error('Failed to log DTE processing', error);
      // No lanzamos error para no afectar el procesamiento principal
    }
  }

  /**
   * Obtiene logs de un usuario específico
   */
  async getUserLogs(
    userId: string, 
    limit: number = 100,
    tipoVerificacion?: TipoVerificacion
  ): Promise<AuditLogEntry[]> {
    try {
      const adminDb = await getAdminDb();
      let query = adminDb.collection(this.collectionName)
        .where('userId', '==', userId)
        .orderBy('fechaHora', 'desc')
        .limit(limit);

      if (tipoVerificacion) {
        query = query.where('tipoVerificacion', '==', tipoVerificacion);
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({ 
        id: doc.id, 
        ...doc.data() 
      } as AuditLogEntry & { id: string }));
    } catch (error) {
      this.serviceLogger.error('Failed to get user logs', error);
      return [];
    }
  }

  /**
   * Obtiene estadísticas de procesamiento de un usuario
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
      const snapshot = await adminDb.collection(this.collectionName)
        .where('userId', '==', userId)
        .get();

      const logs = snapshot.docs.map((doc: any) => doc.data() as AuditLogEntry);
      
      const stats = {
        totalProcesos: logs.length,
        procesosExitosos: logs.filter((log: AuditLogEntry) => log.exito).length,
        procesosFallidos: logs.filter((log: AuditLogEntry) => !log.exito).length,
        totalArchivos: logs.reduce((sum: number, log: AuditLogEntry) => sum + log.cantidadArchivos, 0),
        tiposVerificacion: {
          CSV: logs.filter((log: AuditLogEntry) => log.tipoVerificacion === 'CSV').length,
          JSON: logs.filter((log: AuditLogEntry) => log.tipoVerificacion === 'JSON').length,
          CODIGO_FECHA: logs.filter((log: AuditLogEntry) => log.tipoVerificacion === 'CODIGO_FECHA').length,
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
   * Obtiene todos los logs (solo para admins) con paginación
   */
  async getAllLogs(
    page: number = 1,
    limit: number = 50,
    filters?: {
      tipoVerificacion?: TipoVerificacion;
      exito?: boolean;
      fechaDesde?: Date;
      fechaHasta?: Date;
    }
  ): Promise<{
    logs: (AuditLogEntry & { id: string })[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const adminDb = await getAdminDb();
      let query = adminDb.collection(this.collectionName)
        .orderBy('fechaHora', 'desc');

      if (filters?.tipoVerificacion) {
        query = query.where('tipoVerificacion', '==', filters.tipoVerificacion);
      }

      if (filters?.exito !== undefined) {
        query = query.where('exito', '==', filters.exito);
      }

      if (filters?.fechaDesde) {
        query = query.where('fechaHora', '>=', filters.fechaDesde);
      }

      if (filters?.fechaHasta) {
        query = query.where('fechaHasta', '<=', filters.fechaHasta);
      }

      const offset = (page - 1) * limit;
      const snapshot = await query.limit(limit + 1).offset(offset).get();
      
      const logs = snapshot.docs.slice(0, limit).map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      } as AuditLogEntry & { id: string }));

      const hasMore = snapshot.docs.length > limit;
      const total = await this.getTotalCount(filters);

      return { logs, total, hasMore };
    } catch (error) {
      this.serviceLogger.error('Failed to get all logs', error);
      return { logs: [], total: 0, hasMore: false };
    }
  }

  /**
   * Obtiene el conteo total de logs con filtros
   */
  private async getTotalCount(filters?: {
    tipoVerificacion?: TipoVerificacion;
    exito?: boolean;
    fechaDesde?: Date;
    fechaHasta?: Date;
  }): Promise<number> {
    try {
      const adminDb = await getAdminDb();
      let query: any = adminDb.collection(this.collectionName);

      if (filters?.tipoVerificacion) {
        query = query.where('tipoVerificacion', '==', filters.tipoVerificacion);
      }

      if (filters?.exito !== undefined) {
        query = query.where('exito', '==', filters.exito);
      }

      if (filters?.fechaDesde) {
        query = query.where('fechaHora', '>=', filters.fechaDesde);
      }

      if (filters?.fechaHasta) {
        query = query.where('fechaHasta', '<=', filters.fechaHasta);
      }

      const snapshot = await query.count().get();
      return snapshot.data().count;
    } catch (error) {
      this.serviceLogger.error('Failed to get total count', error);
      return 0;
    }
  }

  /**
   * Limpia logs antiguos (para mantener la base de datos limpia)
   */
  async cleanOldLogs(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const adminDb = await getAdminDb();
      const snapshot = await adminDb.collection(this.collectionName)
        .where('fechaHora', '<', cutoffDate)
        .limit(500) // Procesar en lotes
        .get();

      const batch = adminDb.batch();
      snapshot.docs.forEach((doc: any) => batch.delete(doc.ref));
      
      await batch.commit();
      
      this.serviceLogger.info(`Cleaned ${snapshot.docs.length} old audit logs`);
      return snapshot.docs.length;
    } catch (error) {
      this.serviceLogger.error('Failed to clean old logs', error);
      return 0;
    }
  }
}

export const auditLogService = new AuditLogService();
export default auditLogService;