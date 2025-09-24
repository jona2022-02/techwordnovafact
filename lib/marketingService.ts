// lib/marketingService.ts
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
import { MarketingPlan } from '@/types/membership';

export class MarketingService {
  private static instance: MarketingService;
  
  public static getInstance(): MarketingService {
    if (!MarketingService.instance) {
      MarketingService.instance = new MarketingService();
    }
    return MarketingService.instance;
  }

  // Obtener todos los planes de marketing
  async getAllPlans(): Promise<MarketingPlan[]> {
    try {
      const plansRef = collection(db, 'marketing_plans');
      const q = query(plansRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as MarketingPlan[];
    } catch (error) {
      console.error('Error obteniendo planes:', error);
      throw error;
    }
  }

  // Obtener solo planes activos (para mostrar a usuarios)
  async getActivePlans(): Promise<MarketingPlan[]> {
    try {
      const plansRef = collection(db, 'marketing_plans');
      const q = query(
        plansRef, 
        where('isActive', '==', true),
        orderBy('price', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as MarketingPlan[];
    } catch (error) {
      console.error('Error obteniendo planes activos:', error);
      throw error;
    }
  }

  // Obtener un plan específico
  async getPlanById(planId: string): Promise<MarketingPlan | null> {
    try {
      const planRef = doc(db, 'marketing_plans', planId);
      const planSnap = await getDoc(planRef);
      
      if (planSnap.exists()) {
        return {
          id: planSnap.id,
          ...planSnap.data(),
          createdAt: planSnap.data().createdAt?.toDate(),
          updatedAt: planSnap.data().updatedAt?.toDate()
        } as MarketingPlan;
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo plan:', error);
      throw error;
    }
  }

  // Crear un nuevo plan
  async createPlan(planData: Omit<MarketingPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const planId = `plan-${Date.now()}`;
      const planRef = doc(db, 'marketing_plans', planId);
      
      const now = Timestamp.now();
      const plan = {
        ...planData,
        createdAt: now,
        updatedAt: now
      };
      
      await setDoc(planRef, plan);
      return planId;
    } catch (error) {
      console.error('Error creando plan:', error);
      throw error;
    }
  }

  // Actualizar un plan existente
  async updatePlan(planId: string, updates: Partial<Omit<MarketingPlan, 'id' | 'createdAt'>>): Promise<void> {
    try {
      const planRef = doc(db, 'marketing_plans', planId);
      
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };

      await updateDoc(planRef, updateData);
    } catch (error) {
      console.error('Error actualizando plan:', error);
      throw error;
    }
  }

  // Eliminar un plan
  async deletePlan(planId: string): Promise<void> {
    try {
      const planRef = doc(db, 'marketing_plans', planId);
      await deleteDoc(planRef);
    } catch (error) {
      console.error('Error eliminando plan:', error);
      throw error;
    }
  }

  // Activar/desactivar un plan
  async togglePlanStatus(planId: string, isActive: boolean): Promise<void> {
    try {
      await this.updatePlan(planId, { isActive });
    } catch (error) {
      console.error('Error cambiando estado del plan:', error);
      throw error;
    }
  }

  // Marcar/desmarcar como popular
  async togglePopularStatus(planId: string, isPopular: boolean): Promise<void> {
    try {
      await this.updatePlan(planId, { isPopular });
    } catch (error) {
      console.error('Error cambiando estado popular del plan:', error);
      throw error;
    }
  }

  // Obtener plan popular (si existe)
  async getPopularPlan(): Promise<MarketingPlan | null> {
    try {
      const plansRef = collection(db, 'marketing_plans');
      const q = query(
        plansRef, 
        where('isActive', '==', true),
        where('isPopular', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        } as MarketingPlan;
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo plan popular:', error);
      throw error;
    }
  }

  // Obtener estadísticas de planes
  async getPlansStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    popular: number;
  }> {
    try {
      const plans = await this.getAllPlans();
      
      return {
        total: plans.length,
        active: plans.filter(p => p.isActive).length,
        inactive: plans.filter(p => !p.isActive).length,
        popular: plans.filter(p => p.isPopular).length
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }
}