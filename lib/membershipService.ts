// lib/membershipService.ts
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  MembershipSettings, 
  UserMembership, 
  PaymentRecord, 
  MembershipStatus,
  MembershipPlan,
  MarketingPlan,
  MembershipStatusExtended,
  UserMembershipDetailed 
} from '@/types/membership';
import { UserProfile } from '@/types/auth';

export class MembershipService {
  private static instance: MembershipService;
  
  public static getInstance(): MembershipService {
    if (!MembershipService.instance) {
      MembershipService.instance = new MembershipService();
    }
    return MembershipService.instance;
  }

  // CONFIGURACIÓN DE MEMBRESÍAS (Admin)
  async getMembershipSettings(): Promise<MembershipSettings | null> {
    try {
      const docRef = doc(db, 'membershipSettings', 'default');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          monthlyPrice: data.monthlyPrice,
          currency: data.currency || 'USD',
          isActive: data.isActive,
          description: data.description,
          features: data.features || [],
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting membership settings:', error);
      throw error;
    }
  }

  async updateMembershipSettings(settings: Partial<MembershipSettings>): Promise<void> {
    try {
      const docRef = doc(db, 'membershipSettings', 'default');
      await setDoc(docRef, {
        ...settings,
        updatedAt: Timestamp.now()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating membership settings:', error);
      throw error;
    }
  }

  // MEMBRESÍAS DE USUARIOS
  async getUserMembership(userId: string): Promise<UserMembership | null> {
    try {
      console.log(`🔍 Searching membership for user: ${userId}`);
      
      // Intentar consulta con orderBy (requiere índice)
      let querySnapshot;
      try {
        const q = query(
          collection(db, 'userMemberships'),
          where('userId', '==', userId),
          orderBy('endDate', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (indexError) {
        console.warn(`⚠️ Index not ready, using simple query:`, indexError);
        // Fallback: consulta simple sin orderBy
        const simpleQ = query(
          collection(db, 'userMemberships'),
          where('userId', '==', userId)
        );
        querySnapshot = await getDocs(simpleQ);
      }
      
      console.log(`📊 Found ${querySnapshot.docs.length} membership records for user ${userId}`);
      
      if (querySnapshot.empty) {
        console.log(`❌ No memberships found for user: ${userId}`);
        return null;
      }

      // Log all found memberships for debugging
      querySnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`📄 Membership ${index + 1}:`, {
          id: doc.id,
          userId: data.userId,
          status: data.status,
          startDate: data.startDate?.toDate?.()?.toISOString(),
          endDate: data.endDate?.toDate?.()?.toISOString(),
          createdAt: data.createdAt?.toDate?.()?.toISOString()
        });
      });

      const doc = querySnapshot.docs[0]; // Most recent membership
      const data = doc.data();
      
      const membership = {
        id: doc.id,
        userId: data.userId,
        planId: data.planId || data.membershipId || 'basic', // Migration compatibility
        status: data.status,
        startDate: data.startDate?.toDate(),
        endDate: data.endDate?.toDate(),
        isActive: data.isActive !== undefined ? data.isActive : data.autoRenew || false,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        suspendedAt: data.suspendedAt?.toDate(),
        suspensionReason: data.suspensionReason
      };

      console.log(`✅ Returning most recent membership:`, membership);
      return membership;

    } catch (error) {
      console.error('❌ Error getting user membership:', error);
      throw error;
    }
  }

  async createUserMembership(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<string> {
    try {
      const membershipRef = doc(collection(db, 'userMemberships'));
      const membershipData = {
        userId,
        membershipId: 'default',
        status: 'active' as MembershipStatus,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        autoRenew: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(membershipRef, membershipData);
      return membershipRef.id;
    } catch (error) {
      console.error('Error creating user membership:', error);
      throw error;
    }
  }

  async updateUserMembership(
    membershipId: string, 
    updates: Partial<UserMembership>
  ): Promise<void> {
    try {
      const membershipRef = doc(db, 'userMemberships', membershipId);
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now()
      };

      // Convertir fechas a Timestamp si existen
      if (updates.startDate) {
        updateData.startDate = Timestamp.fromDate(updates.startDate);
      }
      if (updates.endDate) {
        updateData.endDate = Timestamp.fromDate(updates.endDate);
      }
      if (updates.suspendedAt) {
        updateData.suspendedAt = Timestamp.fromDate(updates.suspendedAt);
      }

      await updateDoc(membershipRef, updateData);
    } catch (error) {
      console.error('Error updating user membership:', error);
      throw error;
    }
  }

  async suspendUserMembership(membershipId: string, reason: string): Promise<void> {
    try {
      await this.updateUserMembership(membershipId, {
        status: 'suspended',
        suspendedAt: new Date(),
        suspensionReason: reason
      });
    } catch (error) {
      console.error('Error suspending membership:', error);
      throw error;
    }
  }

  async reactivateUserMembership(membershipId: string): Promise<void> {
    try {
      await this.updateUserMembership(membershipId, {
        status: 'active',
        suspendedAt: undefined,
        suspensionReason: undefined
      });
    } catch (error) {
      console.error('Error reactivating membership:', error);
      throw error;
    }
  }

  // VERIFICACIONES
  async checkMembershipStatus(userId: string): Promise<{
    hasValidMembership: boolean;
    membership: UserMembership | null;
    daysRemaining?: number;
  }> {
    try {
      console.log(`🔍 Checking membership status for user: ${userId}`);
      
      const membership = await this.getUserMembership(userId);
      
      if (!membership) {
        console.log(`❌ No membership found for user: ${userId}`);
        return {
          hasValidMembership: false,
          membership: null
        };
      }

      console.log(`📋 Membership found:`, {
        id: membership.id,
        status: membership.status,
        startDate: membership.startDate?.toISOString(),
        endDate: membership.endDate?.toISOString(),
        isActive: membership.isActive
      });

      const now = new Date();
      console.log(`🕐 Current date: ${now.toISOString()}`);

      // Verificar si la membresía está activa
      const isActive = membership.status === 'active' && 
                      membership.startDate && 
                      membership.endDate && 
                      membership.startDate <= now && 
                      membership.endDate >= now;

      console.log(`✅ Membership validation:`, {
        statusIsActive: membership.status === 'active',
        hasStartDate: !!membership.startDate,
        hasEndDate: !!membership.endDate,
        startDateValid: membership.startDate ? membership.startDate <= now : false,
        endDateValid: membership.endDate ? membership.endDate >= now : false,
        finalResult: isActive
      });

      const daysRemaining = isActive && membership.endDate ? 
        Math.ceil((membership.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      const result = {
        hasValidMembership: isActive,
        membership,
        daysRemaining
      };

      console.log(`🎯 Final membership status:`, result);
      return result;

    } catch (error) {
      console.error('❌ Error checking membership status:', error);
      return {
        hasValidMembership: false,
        membership: null
      };
    }
  }

  // OBTENER TODAS LAS MEMBRESÍAS (Admin)
  async getAllUserMemberships(): Promise<UserMembership[]> {
    try {
      const q = query(
        collection(db, 'userMemberships'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          planId: data.planId || data.membershipId || 'basic', // Migration compatibility
          status: data.status,
          startDate: data.startDate?.toDate(),
          endDate: data.endDate?.toDate(),
          isActive: data.isActive !== undefined ? data.isActive : (data.autoRenew || false),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          suspendedAt: data.suspendedAt?.toDate(),
          suspensionReason: data.suspensionReason
        };
      });
    } catch (error) {
      console.error('Error getting all memberships:', error);
      throw error;
    }
  }

  // PAGOS (futuro)
  async createPaymentRecord(payment: Omit<PaymentRecord, 'id' | 'createdAt'>): Promise<string> {
    try {
      const paymentRef = doc(collection(db, 'paymentRecords'));
      await setDoc(paymentRef, {
        ...payment,
        paymentDate: Timestamp.fromDate(payment.paymentDate),
        createdAt: Timestamp.now()
      });
      return paymentRef.id;
    } catch (error) {
      console.error('Error creating payment record:', error);
      throw error;
    }
  }

  // MÉTODOS PARA ACTUALIZAR USUARIOS CON INFORMACIÓN DE MEMBRESÍA
  
  /**
   * Actualizar el estado de membresía de un usuario en la colección users
   */
  async updateUserMembershipStatus(
    userId: string, 
    status: 'activa' | 'desactivada' | 'bloqueada',
    startDate?: Date,
    endDate?: Date,
    membershipId?: string
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const updateData: Partial<UserProfile> = {
        membershipStatus: status
      };

      if (startDate) {
        updateData.membershipStartDate = startDate.toISOString();
      }
      if (endDate) {
        updateData.membershipEndDate = endDate.toISOString();
      }
      if (membershipId) {
        updateData.currentMembershipId = membershipId;
      }

      await updateDoc(userRef, updateData);
    } catch (error) {
      console.error('Error actualizando estado de membresía del usuario:', error);
      throw error;
    }
  }

  /**
   * Activar membresía para un usuario
   */
  async activateUserMembership(userId: string, planId: string, duration: number = 30): Promise<UserMembership> {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + duration);

      // Crear/actualizar membresía en userMemberships
      const membershipId = `membership-${userId}-${Date.now()}`;
      const membershipRef = doc(db, 'userMemberships', membershipId);
      
      const membershipData: Omit<UserMembership, 'id'> = {
        userId,
        planId: planId,
        status: 'active',
        startDate,
        endDate,
        isActive: true,
        createdAt: startDate,
        updatedAt: startDate
      };

      await setDoc(membershipRef, {
        ...membershipData,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        createdAt: Timestamp.fromDate(startDate),
        updatedAt: Timestamp.fromDate(startDate)
      });

      // Actualizar usuario con estado de membresía
      await this.updateUserMembershipStatus(userId, 'activa', startDate, endDate, planId);

      return {
        id: membershipId,
        ...membershipData
      };
    } catch (error) {
      console.error('Error activando membresía:', error);
      throw error;
    }
  }

  /**
   * Desactivar membresía de un usuario
   */
  async deactivateUserMembership(userId: string, reason?: string): Promise<void> {
    try {
      // Buscar membresía activa del usuario
      const userMembership = await this.getUserMembership(userId);
      
      if (userMembership) {
        // Actualizar estado en userMemberships
        const membershipRef = doc(db, 'userMemberships', userMembership.id);
        await updateDoc(membershipRef, {
          status: 'cancelled',
          suspendedAt: Timestamp.now(),
          suspensionReason: reason || 'Desactivada por administrador',
          updatedAt: Timestamp.now()
        });
      }

      // Actualizar estado en users
      await this.updateUserMembershipStatus(userId, 'desactivada');
    } catch (error) {
      console.error('Error desactivando membresía:', error);
      throw error;
    }
  }

  /**
   * Bloquear membresía de un usuario
   */
  async blockUserMembership(userId: string, reason?: string): Promise<void> {
    try {
      // Buscar membresía activa del usuario
      const userMembership = await this.getUserMembership(userId);
      
      if (userMembership) {
        // Actualizar estado en userMemberships
        const membershipRef = doc(db, 'userMemberships', userMembership.id);
        await updateDoc(membershipRef, {
          status: 'suspended',
          suspendedAt: Timestamp.now(),
          suspensionReason: reason || 'Bloqueada por administrador',
          updatedAt: Timestamp.now()
        });
      }

      // Actualizar estado en users
      await this.updateUserMembershipStatus(userId, 'bloqueada');
    } catch (error) {
      console.error('Error bloqueando membresía:', error);
      throw error;
    }
  }

  /**
   * Obtener membresía detallada de un usuario (con información del plan)
   */
  async getUserMembershipDetailed(userId: string): Promise<UserMembershipDetailed | null> {
    try {
      const userMembership = await this.getUserMembership(userId);
      if (!userMembership) return null;

      // Obtener detalles del plan desde marketing_plans
      const planRef = doc(db, 'marketing_plans', userMembership.planId);
      const planSnap = await getDoc(planRef);

      let planDetails: MarketingPlan | undefined;
      if (planSnap.exists()) {
        planDetails = {
          id: planSnap.id,
          ...planSnap.data(),
          createdAt: planSnap.data().createdAt?.toDate(),
          updatedAt: planSnap.data().updatedAt?.toDate()
        } as MarketingPlan;
      }

      // Obtener historial de pagos
      const paymentsQuery = query(
        collection(db, 'paymentRecords'),
        where('userId', '==', userId),
        where('membershipId', '==', userMembership.id),
        orderBy('paymentDate', 'desc')
      );
      
      const paymentsSnap = await getDocs(paymentsQuery);
      const paymentHistory = paymentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        paymentDate: doc.data().paymentDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      })) as PaymentRecord[];

      return {
        ...userMembership,
        planDetails,
        paymentHistory
      };
    } catch (error) {
      console.error('Error obteniendo membresía detallada:', error);
      throw error;
    }
  }

  /**
   * Verificar si la membresía de un usuario está activa
   */
  async isUserMembershipActive(userId: string): Promise<boolean> {
    try {
      const userMembership = await this.getUserMembership(userId);
      if (!userMembership) return false;

      const now = new Date();
      return (
        userMembership.status === 'active' && 
        userMembership.endDate > now
      );
    } catch (error) {
      console.error('Error verificando estado de membresía:', error);
      return false;
    }
  }

  /**
   * Obtener estadísticas de membresías
   */
  async getMembershipStats(): Promise<{
    totalUsers: number;
    activeMembers: number;
    expiredMembers: number;
    blockedMembers: number;
    revenue: number;
  }> {
    try {
      const memberships = await this.getAllUserMemberships();
      
      const stats = {
        totalUsers: memberships.length,
        activeMembers: memberships.filter(m => m.status === 'active').length,
        expiredMembers: memberships.filter(m => m.status === 'expired').length,
        blockedMembers: memberships.filter(m => m.status === 'suspended').length,
        revenue: 0
      };

      // Calcular revenue desde paymentRecords
      const paymentsQuery = query(
        collection(db, 'paymentRecords'),
        where('status', '==', 'completed')
      );
      
      const paymentsSnap = await getDocs(paymentsQuery);
      stats.revenue = paymentsSnap.docs.reduce((total, doc) => {
        return total + (doc.data().amount || 0);
      }, 0);

      return stats;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }
}

export const membershipService = MembershipService.getInstance();