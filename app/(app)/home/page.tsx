'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { SyncUserButton } from '@/components/admin/SyncUserButton';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { BarChart, FileText, Settings, ChevronDown, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';

// Animaciones
const container: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: 'easeOut', when: 'beforeChildren', staggerChildren: 0.06 }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } }
};

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const name = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Usuario');
  const email = user?.email ?? '';

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  return (
    <AuthGuard>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="p-3 sm:p-4 md:p-6 space-y-6 md:space-y-8 max-w-7xl mx-auto"
      >
        {/* Hero Section */}
        <motion.section variants={item} className="rounded-xl md:rounded-2xl border bg-gradient-to-r from-primary/20 to-blue-500/20 p-4 sm:p-5 md:px-6 md:py-5 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent truncate">
                Hola, {name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Plataforma para verificar y gestionar tus DTEs electrónicos.
              </p>
              {email && <p className="mt-1 text-xs text-muted-foreground/70 truncate">Sesión: {email}</p>}
            </div>
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary/80 flex-shrink-0" />
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <Link href="/verificadorDTE/verificador" className="flex-1 sm:flex-initial">
              <Button className="gap-2 w-full sm:w-auto">
                Ir al Verificador <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/configuraciones" className="flex-1 sm:flex-initial">
              <Button variant="outline" className="text-foreground w-full sm:w-auto">
                Configuración
              </Button>
            </Link>
          </div>
        </motion.section>

        {/* Sync Button */}
        <motion.section variants={item}>
          <SyncUserButton />
        </motion.section>

        {/* Cards Grid - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <motion.div variants={item}>
            <Card className="border transition-colors hover:border-primary/50 hover:bg-accent/50 h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base sm:text-lg">Verificador DTEs</CardTitle>
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Revisa el estado de los Documentos Tributarios Electrónicos.
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between text-sm">
                      Ir al Verificador
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[260px]">
                    <DropdownMenuLabel>Elegir destino</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/verificadorDTE/verificador">Verificar por enlace / portal</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/verificadorDTE/verificarodyfecha">Verificar por código y fecha</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/verificadorDTE/verificadorjson">Verificar por archivos JSON</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/verificadorDTE/verificacion_individual">Verificación individual</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border transition-colors hover:border-primary/50 hover:bg-accent/50 h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base sm:text-lg">Configuración</CardTitle>
                <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ajusta la apariencia del sistema y notificaciones.
                </p>
                <Link href="/configuraciones">
                  <Button variant="outline" className="w-full text-sm">
                    Ir a Configuración
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item} className="sm:col-span-2 lg:col-span-1">
            <Card className="border transition-colors hover:border-primary/50 hover:bg-accent/50 h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base sm:text-lg">Reportes</CardTitle>
                <BarChart className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Genera informes en PDF y Excel de tus documentos electrónicos.
                </p>
                <Button disabled className="w-full opacity-60 text-sm">En desarrollo</Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </AuthGuard>
  );
}