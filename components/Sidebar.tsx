'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { getSidebarItems } from './sidebar-items';
import {
  Home,
  FileText,
  Settings,
  Landmark,
  ChevronDown,
  ChevronRight,
  LogOut,
  Users,
  Shield,
  Crown,
  Database,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { motion, type Variants } from 'framer-motion';

type NavChild = { href: string; label: string };
type Item = { href: string; label: string; icon: any; children?: NavChild[]; permissionId?: string };

// Variants para orquestar entrada con stagger
const asideVariants: Variants = {
  hidden: { x: -16, opacity: 0 },
  show: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 120, damping: 16, mass: 0.8 }
  }
};

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } }
};

const itemVariants: Variants = {
  hidden: { y: 6, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.18, ease: 'easeOut' }
  }
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, permissions, hasPermission, isAdmin, loading } = useUserRole();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  
  // Extraer datos del usuario
  const name = user?.displayName || 'Usuario';
  const email = user?.email || '';
  const photoURL = user?.photoURL;

  // Crear la estructura de items dinámicos basado en permisos
  const getMenuItems = (): Item[] => {
    if (loading || !permissions.length) return [];

    const items: Item[] = [];

    // Agregar Inicio si tiene permiso
    if (hasPermission('home')) {
      items.push({ href: '/home', label: 'Inicio', icon: Home, permissionId: 'home' });
    }

    // Agrupar verificadores si tiene algún permiso
    const verificadorChildren: NavChild[] = [];
    if (hasPermission('verificador-masivo')) {
      verificadorChildren.push({ href: '/verificadorDTE/verificador', label: 'Verificador Links' });
    }
    if (hasPermission('verificador-codigo-fecha')) {
      verificadorChildren.push({ href: '/verificadorDTE/verificarodyfecha', label: 'Verificador Código y Fecha' });
    }
    if (hasPermission('verificador-json')) {
      verificadorChildren.push({ href: '/verificadorDTE/verificadorjson', label: 'Verificador JSON' });
    }
    if (hasPermission('verificador-individual')) {
      verificadorChildren.push({ href: '/verificadorDTE/verificacion_individual', label: 'Verificación Individual' });
    }

    if (verificadorChildren.length > 0) {
      items.push({
        href: '/verificadorDTE',
        label: 'Verificar DTEs',
        icon: FileText,
        children: verificadorChildren
      });
    }

    // Agregar bancos si tiene permiso
    if (hasPermission('bancos-davivienda')) {
      items.push({
        href: '/bancos',
        label: 'Bancos',
        icon: Landmark,
        children: [{ href: '/bancos/davivienda-194', label: 'Davivienda 194' }]
      });
    }

    // Agregar gestión de usuarios solo para administradores
    if (hasPermission('usuarios')) {
      items.push({ href: '/usuarios', label: 'Gestión de Usuarios', icon: Users, permissionId: 'usuarios' });
    }

    // Agregar gestión de membresías solo para administradores
    if (hasPermission('membresias')) {
      items.push({ href: '/membership', label: 'Gestión de Membresías', icon: Crown, permissionId: 'membresias' });
    }

    // Agregar inicialización de Firebase solo para administradores
    if (hasPermission('admin-firebase')) {
      items.push({ href: '/admin/firebase-init', label: 'Inicializar Firebase', icon: Database, permissionId: 'admin-firebase' });
    }

    // Agregar gestión de marketing solo para administradores
    if (hasPermission('admin-marketing')) {
      items.push({ href: '/admin/marketing', label: 'Gestión de Marketing', icon: TrendingUp, permissionId: 'admin-marketing' });
    }

    // Agregar reportes de actividad solo para administradores
    if (hasPermission('admin-reportes')) {
      items.push({ href: '/admin/reportes', label: 'Reportes de Actividad', icon: BarChart3, permissionId: 'admin-reportes' });
    }

    // Agregar "Mi Membresía" para usuarios regulares
    if (hasPermission('mi-membresia')) {
      items.push({ href: '/mi-membresia', label: 'Mi Membresía', icon: Crown, permissionId: 'mi-membresia' });
    }

    // Agregar "Mi Actividad" para usuarios con el permiso
    if (hasPermission('mi-actividad')) {
      items.push({ href: '/mi-actividad', label: 'Mi Actividad', icon: TrendingUp, permissionId: 'mi-actividad' });
    }

    // Agregar configuraciones si tiene permiso
    if (hasPermission('configuraciones')) {
      items.push({ href: '/configuraciones', label: 'Configuración', icon: Settings, permissionId: 'configuraciones' });
    }

    return items;
  };

  const items = getMenuItems();
  const match = (base: string) => pathname === base || pathname.startsWith(base + '/');

  const handleLogout = async () => {
    try {
      if (!auth) {
        console.error('Auth no está inicializado');
        return;
      }
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const initials = (name?.[0] || email?.[0] || '?').toUpperCase();

  return (
    <motion.aside
      variants={asideVariants}
      initial="hidden"
      animate="show"
      className="w-64 h-screen bg-slate-950 text-white p-4 flex flex-col justify-between border-r border-white/10"
    >
      <div>
        {/* Marca */}
        <motion.div variants={itemVariants} className="mb-6 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center ring-1 ring-white/10">
            <div className="h-3 w-3 rounded-sm bg-white/80" />
          </div>
          <div className="leading-tight">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent">
              NovaFact
            </h2>
            <p className="text-[11px] text-white/60">Verificador de DTEs</p>
          </div>
        </motion.div>

        {/* Perfil */}
        <motion.div
          variants={itemVariants}
          className="mb-6 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
        >
          {photoURL ? (
            <img
              src={photoURL}
              alt="avatar"
              className="h-10 w-10 rounded-full object-cover ring-2 ring-blue-400/40"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-2 ring-blue-400/30 text-base font-semibold">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{name}</p>
            <p className="text-[12px] text-white/70 truncate">{email}</p>
            {/* Badge del rol */}
            {role && (
              <div className="mt-1 flex">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  isAdmin() 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  <Shield className="h-3 w-3 mr-1" />
                  {isAdmin() ? 'Administrador' : 'Cliente'}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Navegación dinámica con stagger */}
        <motion.nav variants={listVariants} initial="hidden" animate="show" className="space-y-1 flex-1">
          {items.map(({ href, label, icon: Icon, children }) => {
            const activeParent = match(href);
            const activeChild = children?.some((c) => match(c.href)) ?? false;
            const active = activeParent || activeChild;

            if (!children) {
              return (
                <motion.div key={href} variants={itemVariants}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition
                      ${active ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
                  >
                    <span
                      className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 rounded-r-full transition-all
                      ${active ? 'w-1 bg-blue-400/80' : 'w-0 bg-transparent group-hover:w-1 group-hover:bg-blue-400/50'}`}
                    />
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="truncate">{label}</span>
                  </Link>
                </motion.div>
              );
            }

            return (
              <motion.details key={href} className="group" open={active} variants={itemVariants}>
                <summary
                  className={`relative flex cursor-pointer items-center gap-3 list-none rounded-lg px-3 py-2 text-sm transition
                  ${active ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
                >
                  <span
                    className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 rounded-r-full transition-all
                    ${active ? 'w-1 bg-blue-400/80' : 'w-0 bg-transparent group-open:w-1 group-open:bg-blue-400/60'}`}
                  />
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                </summary>

                <div className="mt-1 ml-4 flex flex-col gap-1 border-l border-white/10 pl-3">
                  {children.map((c) => {
                    const childActive = match(c.href);
                    return (
                      <motion.div key={c.href} variants={itemVariants}>
                        <Link
                          href={c.href}
                          aria-current={childActive ? 'page' : undefined}
                          className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition
                            ${childActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full transition
                            ${childActive ? 'bg-blue-300' : 'bg-white/40 group-hover:bg-blue-300/70'}`}
                          />
                          <span className="truncate">{c.label}</span>
                          <ChevronRight className="ml-auto h-4 w-4 opacity-50 group-hover:opacity-80" />
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.details>
            );
          })}

          {/* Mensaje informativo si no hay permisos */}
          {items.length === 0 && (
            <motion.div variants={itemVariants} className="text-center py-8">
              <div className="text-white/40 text-sm">
                No tienes permisos asignados.
                <br />
                Contacta al administrador.
              </div>
            </motion.div>
          )}
        </motion.nav>

        {/* Botón de cerrar sesión */}
        <motion.button
          variants={itemVariants}
          onClick={handleLogout}
          className="group mt-4 inline-flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar sesión</span>
        </motion.button>
      </div>
    </motion.aside>
  );
}
