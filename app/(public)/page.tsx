// app/(public)/page.tsx  (o donde tengas la landing)
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  CheckCircle2,
  BarChart3,
  Zap,
  Users,
  Lock,
  Mail,
  Phone,
  ArrowRight,
} from "lucide-react";
import { PricingDisplay } from "@/components/membership/PricingDisplay";
import { MarketingPlansDisplay, FeaturedPlanDisplay } from "@/components/membership/MarketingPlansDisplay";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const un = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/home"); // solo si hay usuario
    });
    return () => un();
  }, [router]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.25),transparent_60%)]"
        />
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-16 sm:pt-28 sm:pb-20 text-center">
        

          {/* 🔵 LOGO agregado */}
          <div className="mt-5 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Logo NovaFact"
              width={206}
              height={206}
              priority
              className="drop-shadow-[0_0_18px_rgba(59,130,246,0.35)]"
            />
          </div>

          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
            Bienvenido a <span className="text-blue-400">NovaFact</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Plataforma para <strong>verificar</strong> y{" "}
            <strong>gestionar DTEs</strong> , realizar reportes y auditoría.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-medium text-slate-900 shadow hover:opacity-90"
            >
              Iniciar sesión / Registrarse
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#caracteristicas"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 font-medium text-white/90 hover:bg-white/10"
            >
              Ver características
            </a>
          </div>

          {/* mini “trust” */}
          <div className="mt-10 flex items-center justify-center gap-8 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Cifrado en tránsito y reposo
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-300" />
              Roles admin y desarrollador
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-violet-300" />
              Reportes exportables
            </div>
          </div>
        </div>
      </section>

      {/* BENEFICIOS / FEATURES */}
      <section id="caracteristicas" className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            icon={<CheckCircle2 className="h-6 w-6" />}
            title="Verificación ágil"
            desc="Valida DTEs por link, código+fecha o archivos JSON. Registros con trazabilidad."
          />
          <Feature
            icon={<Zap className="h-6 w-6" />}
            title="Flujos simples"
            desc="Diseñado para equipos: menos clics, más foco. Acciones rápidas y estados claros."
          />
          <Feature
            icon={<BarChart3 className="h-6 w-6" />}
            title="Reportes"
            desc="Exporta a PDF/Excel. Filtros, totales y vistas guardadas para tus analíticas."
          />
          <Feature
            icon={<Users className="h-6 w-6" />}
            title="Roles y permisos"
            desc="Admin controla accesos;/desarrollador opera verificaciones. Cambia permisos cuando quieras."
          />
          <Feature
            icon={<Lock className="h-6 w-6" />}
            title="Seguridad"
            desc="Autenticación Firebase, sesiones seguras y buenas prácticas de manejo de datos."
          />
          <Feature
            icon={<ShieldCheck className="h-6 w-6" />}
            title="Auditoría"
            desc="Bitácora de acciones para cumplir con controles internos y trazabilidad."
          />
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <h2 className="text-2xl font-semibold">¿Cómo funciona?</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <Step n={1} title="Conéctate" desc="Crea tu cuenta o inicia sesión con tu correo." />
          <Step n={2} title="Verifica DTEs" desc="Usa link, código+fecha o JSON según necesites." />
          <Step n={3} title="Comparte & Reporta" desc="Descarga reportes y comparte resultados." />
        </div>
      </section>

      {/* INTEGRACIONES / CONFIANZA */}
      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <h3 className="text-lg font-semibold">Integraciones & confianza</h3>
          <p className="mt-2 text-sm text-slate-300">
            Compatible con flujos modernos y almacenamiento seguro. Próximamente: integraciones
            con ERPs y APIs de terceros.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <LogoBox label="Firebase" />
            <LogoBox label="Next.js" />
            <LogoBox label="Tailwind" />
            <LogoBox label="CSV/PDF" />
          </div>
        </div>
      </section>

      {/* PRECIOS / MEMBRESÍA */}
      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Elige el plan perfecto para ti</h2>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Planes diseñados para empresas de todos los tamaños. Comienza gratis y escala cuando necesites.
          </p>
        </div>
        
        {/* Mostrar todos los planes disponibles */}
        <MarketingPlansDisplay />
        
        {/* Fallback: Si no hay planes dinámicos, mostrar el plan estático original */}
        <div className="mt-8 max-w-md mx-auto">
          <div className="text-center text-white/60 text-sm mb-4">
            O continúa con nuestro plan tradicional:
          </div>
          <PricingDisplay />
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="grid items-stretch gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <h3 className="text-lg font-semibold">¿Necesitas ayuda?</h3>
            <p className="mt-2 text-sm text-slate-300">
              Resolvemos dudas de lunes a viernes, 9:00–18:00 (GMT-5). Te respondemos en &lt;24h
              hábiles.
            </p>

            <div className="mt-6 space-y-3 text-sm">
              <a
                href="mailto:soporte@novafact.app"
                className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10"
              >
                <Mail className="h-4 w-4 text-blue-300" />
                <span>soporte@novafact.app</span>
                <ArrowRight className="ml-auto h-4 w-4 opacity-70 group-hover:translate-x-0.5 transition" />
              </a>
              <a
                href="https://wa.me/0000000000"
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10"
              >
                <Phone className="h-4 w-4 text-emerald-300" />
                <span>WhatsApp / +00 000 000 000</span>
                <ArrowRight className="ml-auto h-4 w-4 opacity-70 group-hover:translate-x-0.5 transition" />
              </a>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              También aceptamos tickets por correo. Describe tu caso y adjunta el DTE relevante.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-fuchsia-600/20 p-6 sm:p-8">
            <h3 className="text-lg font-semibold">Acerca del sistema</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                Pensado para equipos que necesitan **verificar** DTEs rápido y con trazabilidad.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                **Roles**: Administrador (gestión y permisos) · Desarrollador (operación diaria).
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                **Seguridad**: autenticación Firebase y buenas prácticas de datos.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                **Exportación**: reportes PDF/Excel con filtros y métricas.
              </li>
            </ul>

            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-medium text-slate-900 shadow hover:opacity-90"
              >
                Probar ahora
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-black/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-6 text-sm text-slate-400 sm:flex-row sm:justify-between">
          <div>© {new Date().getFullYear()} NovaFact. Todos los derechos reservados.</div>
          <div className="flex items-center gap-4">
            <Link href="#contacto" className="hover:text-white">
              Contacto
            </Link>
            <Link href="#" className="hover:text-white">
              Privacidad
            </Link>
            <Link href="#" className="hover:text-white">
              Términos
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ---- Pequeños componentes de UI ---- */

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-blue-200">
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-300">{desc}</p>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm text-blue-300">
        {n}
      </div>
      <h4 className="mt-3 font-medium">{title}</h4>
      <p className="mt-1 text-sm text-slate-300">{desc}</p>
    </div>
  );
}

function LogoBox({ label }: { label: string }) {
  return (
    <div className="flex h-16 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs text-slate-300">
      {label}
    </div>
  );
}
