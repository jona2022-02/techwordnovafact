// lib/procesosDteService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { ProcesoDTE, CrearProcesoDTO } from '@/types/procesosDte';

export class ProcesosDTEService {
  private collectionName = 'procesosdtes';

  // Método para server-side (usa Admin SDK)
  async obtenerTodosLosProcesosServer(
    limite: number = 100,
    filtros?: {
      fechaDesde?: Date;
      fechaHasta?: Date;
      soloExitosos?: boolean;
      userId?: string;
    }
  ): Promise<ProcesoDTE[]> {
    try {
      const adminDb = await getAdminDb();
      let queryRef = adminDb.collection(this.collectionName)
        .orderBy('fechaHora', 'desc')
        .limit(limite);

      // Aplicar filtro de usuario si se especifica
      if (filtros?.userId) {
        queryRef = adminDb.collection(this.collectionName)
          .where('userId', '==', filtros.userId)
          .orderBy('fechaHora', 'desc')
          .limit(limite);
      }

      const snapshot = await queryRef.get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          fechaHora: data.fechaHora.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as ProcesoDTE;
      }).filter(proceso => {
        if (!filtros) return true;
        
        // Filtro por fecha
        if (filtros.fechaDesde && proceso.fechaHora < filtros.fechaDesde) return false;
        if (filtros.fechaHasta && proceso.fechaHora > filtros.fechaHasta) return false;
        
        // Filtro solo exitosos
        if (filtros.soloExitosos && !proceso.exito) return false;
        
        return true;
      });
    } catch (error) {
      console.error('❌ Error al obtener procesos DTE (server):', error);
      throw error;
    }
  }

  // Método para server-side (usa Admin SDK)
  async obtenerEstadisticasProcesosServer(userId?: string): Promise<{
    totalProcesos: number;
    procesosExitosos: number;
    totalArchivos: number;
    totalResultados: number;
    promedioArchiviosPorProceso: number;
    ultimoProceso?: Date;
  }> {
    try {
      const procesos = await this.obtenerTodosLosProcesosServer(1000, { userId });

      const totalProcesos = procesos.length;
      const procesosExitosos = procesos.filter(p => p.exito).length;
      const totalArchivos = procesos.reduce((sum, p) => sum + p.cantidadArchivos, 0);
      const totalResultados = procesos.reduce((sum, p) => sum + p.cantidadResultados, 0);
      const promedioArchiviosPorProceso = totalProcesos > 0 ? totalArchivos / totalProcesos : 0;
      const ultimoProceso = procesos.length > 0 ? procesos[0].fechaHora : undefined;

      return {
        totalProcesos,
        procesosExitosos,
        totalArchivos,
        totalResultados,
        promedioArchiviosPorProceso,
        ultimoProceso,
      };
    } catch (error) {
      console.error('❌ Error al obtener estadísticas (server):', error);
      throw error;
    }
  }

  // Método para server-side (usa Admin SDK)
  async crearProcesoServer(userId: string, userEmail: string, datos: CrearProcesoDTO): Promise<string> {
    try {
      console.log('� ProcesosDTEService.crearProcesoServer (ADMIN SDK) - Iniciando...');
      console.log('📝 Datos recibidos:', { userId, userEmail, datos });
      
      const ahora = new Date();
      const procesoData: Omit<ProcesoDTE, 'id'> = {
        userId,
        userEmail,
        fechaHora: ahora,
        cantidadArchivos: datos.cantidadArchivos,
        cantidadResultados: datos.cantidadResultados,
        tipoVerificacion: datos.tipoVerificacion,
        archivos: datos.archivos,
        resultados: datos.resultados,
        duracionMs: datos.duracionMs,
        exito: datos.exito,
        errorMessage: datos.errorMessage,
        createdAt: ahora,
        updatedAt: ahora,
      };

      console.log('📦 Datos a guardar en Firestore:', procesoData);
      console.log('🗂️ Colección destino:', this.collectionName);

      // Preparar datos para Firestore usando Admin SDK
      const firestoreData: any = {
        userId: procesoData.userId,
        userEmail: procesoData.userEmail,
        fechaHora: procesoData.fechaHora, // Admin SDK maneja Date directamente
        cantidadArchivos: procesoData.cantidadArchivos,
        cantidadResultados: procesoData.cantidadResultados,
        tipoVerificacion: procesoData.tipoVerificacion,
        archivos: procesoData.archivos,
        resultados: procesoData.resultados,
        duracionMs: procesoData.duracionMs,
        exito: procesoData.exito,
        createdAt: procesoData.createdAt,
        updatedAt: procesoData.updatedAt,
      };

      // Solo agregar errorMessage si tiene valor
      if (procesoData.errorMessage !== undefined && procesoData.errorMessage !== null) {
        firestoreData.errorMessage = procesoData.errorMessage;
      }

      console.log('💾 Datos finales para Firestore (Admin SDK):', firestoreData);

      const adminDb = await getAdminDb();
      const docRef = await adminDb.collection(this.collectionName).add(firestoreData);

      console.log('✅ Proceso DTE guardado exitosamente con ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error al guardar proceso DTE en Firestore:', error);
      throw error;
    }
  }

  // Método para client-side (usa Client SDK)
  async crearProceso(userId: string, userEmail: string, datos: CrearProcesoDTO): Promise<string> {
    try {
      console.log('🔧 ProcesosDTEService.crearProceso - Iniciando...');
      console.log('📝 Datos recibidos:', { userId, userEmail, datos });
      
      const ahora = new Date();
      const procesoData: Omit<ProcesoDTE, 'id'> = {
        userId,
        userEmail,
        fechaHora: ahora,
        cantidadArchivos: datos.cantidadArchivos,
        cantidadResultados: datos.cantidadResultados,
        tipoVerificacion: datos.tipoVerificacion,
        archivos: datos.archivos,
        resultados: datos.resultados,
        duracionMs: datos.duracionMs,
        exito: datos.exito,
        errorMessage: datos.errorMessage,
        createdAt: ahora,
        updatedAt: ahora,
      };

      console.log('📦 Datos a guardar en Firestore:', procesoData);
      console.log('🗂️ Colección destino:', this.collectionName);

      // Preparar datos para Firestore, eliminando campos undefined
      const firestoreData: any = {
        userId: procesoData.userId,
        userEmail: procesoData.userEmail,
        fechaHora: Timestamp.fromDate(procesoData.fechaHora),
        cantidadArchivos: procesoData.cantidadArchivos,
        cantidadResultados: procesoData.cantidadResultados,
        tipoVerificacion: procesoData.tipoVerificacion,
        archivos: procesoData.archivos,
        resultados: procesoData.resultados,
        duracionMs: procesoData.duracionMs,
        exito: procesoData.exito,
        createdAt: Timestamp.fromDate(procesoData.createdAt),
        updatedAt: Timestamp.fromDate(procesoData.updatedAt),
      };

      // Solo agregar errorMessage si tiene valor
      if (procesoData.errorMessage !== undefined && procesoData.errorMessage !== null) {
        firestoreData.errorMessage = procesoData.errorMessage;
      }

      console.log('💾 Datos finales para Firestore:', firestoreData);

      if (!db) {
        throw new Error('Firebase client no inicializado');
      }
      const docRef = await addDoc(collection(db, this.collectionName), firestoreData);

      console.log('✅ Proceso DTE guardado exitosamente con ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error al guardar proceso DTE en Firestore:', error);
      throw error;
    }
  }

  async obtenerProcesosPorUsuario(
    userId: string, 
    limite: number = 50,
    filtros?: {
      fechaDesde?: Date;
      fechaHasta?: Date;
      soloExitosos?: boolean;
    }
  ): Promise<ProcesoDTE[]> {
    try {
      if (!db) {
        throw new Error('Firebase client no inicializado');
      }
      let q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        orderBy('fechaHora', 'desc'),
        limit(limite)
      );

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          fechaHora: data.fechaHora.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as ProcesoDTE;
      }).filter(proceso => {
        if (!filtros) return true;
        
        // Filtro por fecha
        if (filtros.fechaDesde && proceso.fechaHora < filtros.fechaDesde) return false;
        if (filtros.fechaHasta && proceso.fechaHora > filtros.fechaHasta) return false;
        
        // Filtro solo exitosos
        if (filtros.soloExitosos && !proceso.exito) return false;
        
        return true;
      });
    } catch (error) {
      console.error('❌ Error al obtener procesos DTE:', error);
      throw error;
    }
  }

  async obtenerTodosLosProcesos(
    limite: number = 100,
    filtros?: {
      fechaDesde?: Date;
      fechaHasta?: Date;
      soloExitosos?: boolean;
      userId?: string;
    }
  ): Promise<ProcesoDTE[]> {
    try {
      if (!db) {
        throw new Error('Firebase client no inicializado');
      }
      let q = query(
        collection(db, this.collectionName),
        orderBy('fechaHora', 'desc'),
        limit(limite)
      );

      // Si se especifica un usuario, filtrar por él
      if (filtros?.userId) {
        q = query(
          collection(db, this.collectionName),
          where('userId', '==', filtros.userId),
          orderBy('fechaHora', 'desc'),
          limit(limite)
        );
      }

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          fechaHora: data.fechaHora.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as ProcesoDTE;
      }).filter(proceso => {
        if (!filtros) return true;
        
        // Filtro por fecha
        if (filtros.fechaDesde && proceso.fechaHora < filtros.fechaDesde) return false;
        if (filtros.fechaHasta && proceso.fechaHora > filtros.fechaHasta) return false;
        
        // Filtro solo exitosos
        if (filtros.soloExitosos && !proceso.exito) return false;
        
        return true;
      });
    } catch (error) {
      console.error('❌ Error al obtener todos los procesos DTE:', error);
      throw error;
    }
  }

  async obtenerEstadisticasProcesos(userId?: string): Promise<{
    totalProcesos: number;
    procesosExitosos: number;
    totalArchivos: number;
    totalResultados: number;
    promedioArchiviosPorProceso: number;
    ultimoProceso?: Date;
  }> {
    try {
      const procesos = await (userId ? 
        this.obtenerProcesosPorUsuario(userId, 1000) : 
        this.obtenerTodosLosProcesos(1000)
      );

      const totalProcesos = procesos.length;
      const procesosExitosos = procesos.filter(p => p.exito).length;
      const totalArchivos = procesos.reduce((sum, p) => sum + p.cantidadArchivos, 0);
      const totalResultados = procesos.reduce((sum, p) => sum + p.cantidadResultados, 0);
      const promedioArchiviosPorProceso = totalProcesos > 0 ? totalArchivos / totalProcesos : 0;
      const ultimoProceso = procesos.length > 0 ? procesos[0].fechaHora : undefined;

      return {
        totalProcesos,
        procesosExitosos,
        totalArchivos,
        totalResultados,
        promedioArchiviosPorProceso,
        ultimoProceso,
      };
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      throw error;
    }
  }
}

export const procesosDteService = new ProcesosDTEService();