// app/verify-email/pending/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
  type User,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

import { motion, useReducedMotion } from "framer-motion";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  MailCheck,
  Loader2,
  RefreshCcw,
  LogOut,
  ArrowLeft,
} from "lucide-react";

export default function VerifyEmailPendingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(auth?.currentUser || null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const email = useMemo(() => user?.email ?? "tu@correo.com", [user]);

  // ↓ Respeta usuarios con "reducir movimiento"
  const reduceMotion = useReducedMotion();
  const cardInitial = { opacity: 0, y: reduceMotion ? 0 : 10 };
  const cardAnimate = { opacity: 1, y: 0 };

  useEffect(() => {
    if (!auth) return;
    const un = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) return;
      await u.reload();
      if (u.emailVerified) router.replace("/home");
    });
    return () => un();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const id = setInterval(async () => {
      await user.reload();
      if (user.emailVerified) router.replace("/home");
    }, 5000);
    return () => clearInterval(id);
  }, [user, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const resend = async () => {
    if (!auth?.currentUser || cooldown > 0) return;
    setSending(true);
    setMsg(null);
    try {
      await sendEmailVerification(auth.currentUser, {
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: true,
      });
      setMsg("Te enviamos un nuevo correo de verificación.");
      setCooldown(30);
      toast.success("Email enviado", { description: "Revisa tu bandeja de entrada" });
    } catch (error) {
      const errorMsg = "No pudimos enviar el correo. Intenta de nuevo en unos minutos.";
      setMsg(errorMsg);
      toast.error("Error", { description: errorMsg });
    } finally {
      setSending(false);
    }
  };

  const checkNow = async () => {
    if (!auth?.currentUser) return;
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) router.replace("/home");
    else setMsg("Aún no vemos la verificación. Revisa tu bandeja o prueba de nuevo en segundos.");
  };

  const doLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    router.replace("/login");
  };

  // --- Estilos utilitarios reutilizables
  const pageBg =
    "relative min-h-screen overflow-hidden text-white " +
    "bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950";

  const glow =
    "pointer-events-none absolute inset-0 " +
    "bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.25),transparent_60%)]";

  const cardStyle =
    // Glass + ring + sombra profunda moderna
    "border-white/10 bg-white/5 backdrop-blur-xl " +
    "ring-1 ring-white/10 shadow-2xl shadow-blue-500/10";

  // Si no hay sesión
  if (!user) {
    return (
      <main className={`${pageBg} grid place-items-center p-6`}>
        <Card className={`w-full max-w-md ${cardStyle}`}>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl font-semibold">
              <Sparkles className="h-5 w-5 text-blue-300" />
              <span className="bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent">
                Confirma tu correo
              </span>
            </CardTitle>
            <p className="text-sm text-slate-300">
              Necesitas iniciar sesión para reenviar el enlace de verificación.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/login">
              <Button className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a iniciar sesión
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className={pageBg}>
      {/* brillo suave */}
      <div aria-hidden className={glow} />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-10 px-6 py-10 md:grid-cols-2">
        {/* LADO IZQUIERDO - Información */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex flex-col justify-between"
        >
          <header className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="NovaFact logo"
              width={100}
              height={100}
              priority
              className="object-contain"
            />
            <div>
              <h1 className="text-xl font-semibold leading-none text-blue-200">NovaFact</h1>
              <p className="text-sm text-slate-300">Verifica y gestiona DTEs con seguridad y velocidad.</p>
            </div>
          </header>

          <div className="mt-8 space-y-4">
            <InfoChip text="Email de verificación seguro" />
            <InfoChip text="Detección automática" />
            <InfoChip text="Enlaces seguros y temporales" />
            <p className="max-w-md text-sm text-slate-300">
              Hemos enviado un email de verificación a tu correo. Una vez verificado, tendrás acceso completo a todas las funcionalidades de NovaFact.
            </p>
          </div>

          <footer className="mt-10 grid gap-3 text-sm text-slate-300">
            <p className="text-slate-400">¿Necesitas ayuda?</p>
            <div className="flex flex-wrap gap-3">
              <a
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
                href="mailto:soporte@novafact.app"
              >
                soporte@novafact.app
              </a>
              <a
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
                href="https://wa.me/0000000000"
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            </div>
          </footer>
        </motion.section>

        {/* LADO DERECHO - Formulario de verificación */}
        <motion.section
          initial={cardInitial}
          animate={cardAnimate}
          transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
          className="flex items-center"
        >
          <Card className={`w-full ${cardStyle}`}>
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center justify-center gap-2 text-center text-2xl font-semibold">
                <MailCheck className="h-5 w-5 text-blue-300" />
                <span className="bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent">
                  Verifica tu correo
                </span>
              </CardTitle>
              <p className="text-center text-sm text-slate-300">
                Te enviamos un enlace a{" "}
                <span className="font-medium text-blue-200">{email}</span>. Ábrelo para completar la verificación.
              </p>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Acciones */}
              <div className="grid gap-3">
                <Button onClick={checkNow} variant="secondary" className="w-full">
                  <MailCheck className="mr-2 h-4 w-4" />
                  Ya verifiqué, comprobar ahora
                </Button>

                <Button
                  onClick={resend}
                  disabled={sending || cooldown > 0}
                  className="w-full"
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Reenviar enlace{cooldown > 0 ? ` (${cooldown}s)` : ""}
                    </>
                  )}
                </Button>

                <Button
                  onClick={doLogout}
                  variant="ghost"
                  className="w-full text-red-300 hover:text-white"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>

              {/* Barra de progreso del cooldown */}
              {cooldown > 0 && (
                <div className="space-y-1">
                  <div
                    className="h-1 w-full overflow-hidden rounded-full bg-white/10"
                    aria-hidden
                  >
                    <div
                      className="h-full bg-gradient-to-r from-blue-400/70 to-cyan-300/70"
                      style={{ width: `${((30 - cooldown) / 30) * 100}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-slate-400">
                    Podrás reenviar en {cooldown}s
                  </p>
                </div>
              )}

              {/* Mensajes anunciados para lectores de pantalla */}
              {msg && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="status"
                  aria-live="polite"
                  className="text-center text-sm text-slate-300/90 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3"
                >
                  {msg}
                </motion.p>
              )}

              {/* Accesos rápidos */}
              <div className="mt-4 space-y-2">
                <p className="text-center text-xs text-slate-400 mb-2">Accesos rápidos a tu email:</p>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                  <a
                    href="https://mail.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-2 ring-1 ring-white/10 hover:bg-white/10 transition-colors"
                  >
                    Gmail
                  </a>
                  <a
                    href="https://outlook.live.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-2 ring-1 ring-white/10 hover:bg-white/10 transition-colors"
                  >
                    Outlook
                  </a>
                  <a
                    href="https://yahoo.com/mail/"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-2 ring-1 ring-white/10 hover:bg-white/10 transition-colors"
                  >
                    Yahoo
                  </a>
                </div>
              </div>

              {/* Información adicional */}
              <div className="text-center text-xs text-slate-400 space-y-1">
                <p>¿No llega el correo? Revisa tu carpeta de spam.</p>
                <p>El enlace expira en 24 horas.</p>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </main>
  );
}

/* Chips reutilizables */
function InfoChip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-blue-200">
      {text}
    </span>
  );
}
