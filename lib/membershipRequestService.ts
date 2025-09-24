// lib/membershipRequestService.ts
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc,
  deleteDoc,
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { MembershipRequest, MembershipRequestStatus } from '@/types/membership';

export class MembershipRequestService {
  private static instance: MembershipRequestService;
  
  public static getInstance(): MembershipRequestService {
    if (!MembershipRequestService.instance) {
      MembershipRequestService.instance = new MembershipRequestService();
    }
    return MembershipRequestService.instance;
  }

  // Crear una nueva solicitud de membresía
  async createRequest(requestData: Omit<MembershipRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const requestId = `req-${Date.now()}`;
      const requestRef = doc(db, 'membership_requests', requestId);
      
      const now = Timestamp.now();
      const request = {
        ...requestData,
        requestDate: Timestamp.fromDate(requestData.requestDate),
        createdAt: now,
        updatedAt: now
      };
      
      await setDoc(requestRef, request);
      return requestId;
    } catch (error) {
      console.error('Error creando solicitud:', error);
      throw error;
    }
  }

  // Obtener todas las solicitudes (para administradores)
  async getAllRequests(): Promise<MembershipRequest[]> {
    try {
      const requestsRef = collection(db, 'membership_requests');
      const q = query(requestsRef, orderBy('requestDate', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        requestDate: doc.data().requestDate?.toDate(),
        processedDate: doc.data().processedDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as MembershipRequest[];
    } catch (error) {
      console.error('Error obteniendo solicitudes:', error);
      throw error;
    }
  }

  // Obtener solicitudes por estado
  async getRequestsByStatus(status: MembershipRequestStatus): Promise<MembershipRequest[]> {
    try {
      const requestsRef = collection(db, 'membership_requests');
      const q = query(
        requestsRef, 
        where('status', '==', status),
        orderBy('requestDate', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        requestDate: doc.data().requestDate?.toDate(),
        processedDate: doc.data().processedDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as MembershipRequest[];
    } catch (error) {
      console.error('Error obteniendo solicitudes por estado:', error);
      throw error;
    }
  }

  // Obtener solicitudes de un usuario específico
  async getUserRequests(userId: string): Promise<MembershipRequest[]> {
    try {
      const requestsRef = collection(db, 'membership_requests');
      const q = query(
        requestsRef, 
        where('userId', '==', userId),
        orderBy('requestDate', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        requestDate: doc.data().requestDate?.toDate(),
        processedDate: doc.data().processedDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as MembershipRequest[];
    } catch (error) {
      console.error('Error obteniendo solicitudes del usuario:', error);
      throw error;
    }
  }

  // Verificar si el usuario ya tiene una solicitud pendiente
  async hasUserPendingRequest(userId: string): Promise<boolean> {
    try {
      const requestsRef = collection(db, 'membership_requests');
      const q = query(
        requestsRef, 
        where('userId', '==', userId),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error verificando solicitud pendiente:', error);
      throw error;
    }
  }

  // Procesar solicitud (aprobar o rechazar)
  async processRequest(
    requestId: string, 
    status: 'approved' | 'rejected',
    processedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      const requestRef = doc(db, 'membership_requests', requestId);
      
      const updateData = {
        status,
        processedBy,
        processedDate: Timestamp.now(),
        notes: notes || null,
        updatedAt: Timestamp.now()
      };

      await updateDoc(requestRef, updateData);
    } catch (error) {
      console.error('Error procesando solicitud:', error);
      throw error;
    }
  }

  // Obtener una solicitud específica
  async getRequestById(requestId: string): Promise<MembershipRequest | null> {
    try {
      const requestRef = doc(db, 'membership_requests', requestId);
      const requestSnap = await getDoc(requestRef);
      
      if (requestSnap.exists()) {
        return {
          id: requestSnap.id,
          ...requestSnap.data(),
          requestDate: requestSnap.data().requestDate?.toDate(),
          processedDate: requestSnap.data().processedDate?.toDate(),
          createdAt: requestSnap.data().createdAt?.toDate(),
          updatedAt: requestSnap.data().updatedAt?.toDate()
        } as MembershipRequest;
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo solicitud:', error);
      throw error;
    }
  }

  // Eliminar solicitud
  async deleteRequest(requestId: string): Promise<void> {
    try {
      const requestRef = doc(db, 'membership_requests', requestId);
      await deleteDoc(requestRef);
    } catch (error) {
      console.error('Error eliminando solicitud:', error);
      throw error;
    }
  }

  // Obtener estadísticas de solicitudes
  async getRequestsStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    try {
      const requests = await this.getAllRequests();
      
      return {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }
}