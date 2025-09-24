// types/membership.ts
export interface MembershipSettings {
  id: string;
  monthlyPrice: number;
  currency: string;
  isActive: boolean;
  description: string;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMembership {
  id: string;
  userId: string;
  planId: string;
  status: MembershipStatus;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  suspendedAt?: Date;
  suspensionReason?: string;
}

export interface PaymentRecord {
  id: string;
  membershipId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentDate: Date;
  paymentMethod: string;
  transactionId?: string;
  notes?: string;
  createdAt: Date;
}

export type MembershipStatus = 
  | 'active'
  | 'expired' 
  | 'suspended'
  | 'cancelled'
  | 'pending';

export type PaymentStatus = 
  | 'completed'
  | 'pending'
  | 'failed'
  | 'refunded';

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: number; // días
  features: string[];
  isDefault: boolean;
  isActive: boolean;
}

// Nueva estructura para planes de marketing (administradores)
export interface MarketingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration: number; // días
  features: string[];
  isActive: boolean;
  isPopular?: boolean; // Para destacar plan recomendado
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // uid del admin que lo creó
}

// Estructura completa de membresía de usuario
export interface UserMembershipDetailed extends UserMembership {
  planDetails?: MarketingPlan;
  paymentHistory?: PaymentRecord[];
}

// Estados de membresía extendidos
export interface MembershipStatusExtended {
  hasActiveMembership: boolean;
  status: MembershipStatus;
  daysUntilExpiration: number | null;
  isExpired: boolean;
  canAccessFeatures: boolean;
  membership?: UserMembershipDetailed;
}

// Solicitudes de membresía
export interface MembershipRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  planId: string;
  planName: string;
  planPrice: number;
  planCurrency: string;
  status: MembershipRequestStatus;
  requestDate: Date;
  processedDate?: Date;
  processedBy?: string; // uid del admin que procesó
  notes?: string; // notas del admin
  createdAt: Date;
  updatedAt: Date;
}

export type MembershipRequestStatus = 
  | 'pending'
  | 'approved' 
  | 'rejected';