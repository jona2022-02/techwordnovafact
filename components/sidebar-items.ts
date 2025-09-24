// components/sidebar-items.ts
import {
  Home,
  FileCheck,
  Files,
  FileCode,
  Calendar,
  Building2,
  Settings,
  Users,
  LogOut,
  Crown,
  Database,
  TrendingUp,
  BarChart3,
  Bug,
} from "lucide-react";
import { AVAILABLE_PERMISSIONS } from "@/types/auth";

// Mapeo de iconos para los permisos
const iconMap = {
  Home,
  FileCheck,
  Files,
  FileCode,
  Calendar,
  Building2,
  Settings,
  Users,
  LogOut,
  Crown,
  Database,
  TrendingUp,
  BarChart3,
  Bug,
};

// Función para obtener items del sidebar basados en permisos
export function getSidebarItems(userPermissions: string[]) {
  // Filtrar permisos disponibles según los permisos del usuario
  const allowedItems = AVAILABLE_PERMISSIONS.filter(permission => 
    userPermissions.includes(permission.id)
  ).map(permission => ({
    name: permission.name,
    href: permission.route,
    icon: iconMap[permission.icon as keyof typeof iconMap] || Home,
    permissionId: permission.id
  }));

  // Siempre agregar el item de cerrar sesión al final
  allowedItems.push({
    name: "Cerrar sesión",
    href: "/logout",
    icon: LogOut,
    permissionId: "logout"
  });

  return allowedItems;
}

// Items estáticos para casos especiales (mantener compatibilidad)
export const sidebarItems = [
  { name: "Inicio", href: "/home", icon: Home },
  { name: "Verificador Individual", href: "/verificadorDTE/verificacion_individual", icon: FileCheck },
  { name: "Verificador Masivo", href: "/verificadorDTE/verificador", icon: Files },
  { name: "Verificador JSON", href: "/verificadorDTE/verificadorjson", icon: FileCode },
  { name: "Verificador Código y Fecha", href: "/verificadorDTE/verificarodyfecha", icon: Calendar },
  { name: "Bancos Davivienda", href: "/bancos/davivienda-194", icon: Building2 },
  { name: "Configuraciones", href: "/configuraciones", icon: Settings },
  { name: "Gestión de Usuarios", href: "/usuarios", icon: Users },
  { name: "Cerrar sesión", href: "/logout", icon: LogOut },
];
