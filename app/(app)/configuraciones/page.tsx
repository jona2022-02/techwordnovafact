'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Monitor, Bell } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';

import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Switch } from '../../../components/ui/switch';
import { Label } from '../../../components/ui/label';
import { Separator } from '../../../components/ui/separator';

// Variantes de animación (entrada suave)
const container: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: 'easeOut', when: 'beforeChildren', staggerChildren: 0.08 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.24, ease: 'easeOut' } },
};

export default function ConfiguracionesPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [notif, setNotif] = useState(true);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto w-full max-w-4xl p-3 sm:p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8"
    >
      {/* Encabezado de página */}
      <motion.header variants={item} className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent">
          Configuraciones
        </h1>
        <p className="text-sm text-slate-300 dark:text-slate-300">
          Personaliza el aspecto y comportamiento de la aplicación. Los cambios se aplican al instante.
        </p>
      </motion.header>

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        {/* Apariencia */}
        <motion.div variants={item}>
          <Card className="rounded-2xl border border-white/10 bg-white/70 text-slate-800 backdrop-blur-xl transition hover:bg-white/80 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-white/20 bg-background/30 p-2 shadow-sm">
                  <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                <CardTitle className="text-lg">Apariencia</CardTitle>
              </div>
            </CardHeader>
            <Separator className="bg-white/20 dark:bg-white/10" />
            <CardContent className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="tema" className="text-sm font-medium">
                  Tema oscuro
                </Label>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  Cambia entre modo claro y oscuro.
                </p>
              </div>
              <Switch
                id="tema"
                checked={isDark}
                onCheckedChange={() => setTheme(isDark ? 'light' : 'dark')}
                aria-label="Cambiar tema"
                className="self-start sm:self-auto"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Notificaciones */}
        <motion.div variants={item}>
          <Card className="rounded-2xl border border-white/10 bg-white/70 text-slate-800 backdrop-blur-xl transition hover:bg-white/80 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-white/20 bg-background/30 p-2 shadow-sm">
                  <Bell className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                <CardTitle className="text-lg">Notificaciones</CardTitle>
              </div>
            </CardHeader>
            <Separator className="bg-white/20 dark:bg-white/10" />
            <CardContent className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="notif" className="text-sm font-medium">
                  Habilitar notificaciones
                </Label>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  Recibe mensajes y alertas del sistema (próximamente).
                </p>
              </div>
              <Switch
                id="notif"
                checked={notif}
                onCheckedChange={setNotif}
                aria-label="Habilitar notificaciones"
                className="self-start sm:self-auto"
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Pie / nota */}
      <motion.p variants={item} className="mt-8 text-center text-xs text-slate-600 dark:text-slate-500">
        Consejo: usa <kbd className="rounded border border-white/20 bg-white/40 px-1.5 py-0.5 text-[10px] dark:border-white/20 dark:bg-white/10">Ctrl</kbd>
        <span className="mx-1">+</span>
        <kbd className="rounded border border-white/20 bg-white/40 px-1.5 py-0.5 text-[10px] dark:border-white/20 dark:bg-white/10">/</kbd> para abrir la ayuda.
      </motion.p>
    </motion.div>
  );
}