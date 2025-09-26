// app/verify-email/code/page.tsx
"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, getIdToken, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Shield,
  RefreshCcw,
  LogOut,
  ArrowLeft,
  KeyRound,
} from "lucide-react";

export default function VerifyCodePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const email = user?.email ?? "tu@correo.com";

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        router.replace("/login");
        return;
      }
      // Si ya está verificado, redirigir
      await u.reload();
      if (u.emailVerified) {
        router.replace("/home");
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const sendVerificationCode = async () => {
    if (!user || cooldown > 0 || sending) return;
    
    setSending(true);
    setError(null);
    
    try {
      const idToken = await getIdToken(user);
      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Código enviado", { description: `Revisa tu correo: ${email}` });
        setCooldown(60); // 1 minuto de cooldown
        
        // En desarrollo, mostrar el código en consola
        if (data.devCode) {
          console.log(`🔑 CÓDIGO DE DESARROLLO: ${data.devCode}`);
          toast.info("Código de desarrollo", { description: `Código: ${data.devCode}` });
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      const errorMsg = error.message || "Error enviando código";
      setError(errorMsg);
      toast.error("Error", { description: errorMsg });
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !code.trim() || verifying) return;
    
    if (code.trim().length !== 6) {
      setError("El código debe tener 6 dígitos");
      return;
    }

    setVerifying(true);
    setError(null);
    
    try {
      const idToken = await getIdToken(user);
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, verificationCode: code.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("¡Verificado!", { description: "Tu cuenta está activa" });
        // Recargar el usuario para actualizar emailVerified
        await user.reload();
        router.replace("/home");
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      const errorMsg = error.message || "Código incorrecto";
      setError(errorMsg);
      toast.error("Error", { description: errorMsg });
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await auth.signOut();
    }
    router.replace("/login");
  };

  const canSubmit = code.trim().length === 6 && !verifying;

  // Si no hay usuario autenticado
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <p className="text-sm text-slate-300">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Brillo suave de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.25),transparent_60%)]"
      />

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
            <InfoChip text="Código de 6 dígitos" />
            <InfoChip text="Válido por 1 minuto" />
            <InfoChip text="Verificación instantánea" />
            <p className="max-w-md text-sm text-slate-300">
              Ingresa el código de 6 dígitos que enviamos a tu correo <span className="font-medium text-blue-200">{email}</span> para verificar tu cuenta.
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

        {/* LADO DERECHO - Formulario de código */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
          className="flex items-center"
        >
          <Card className="w-full border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center justify-center gap-2 text-center text-2xl font-semibold">
                <Shield className="h-5 w-5 text-blue-300" />
                <span className="bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent">
                  Verifica tu cuenta
                </span>
              </CardTitle>
              <p className="text-center text-sm text-slate-300">
                Ingresa el código de 6 dígitos que enviamos a tu correo
              </p>
            </CardHeader>

            <CardContent className="space-y-5">
              <form onSubmit={verifyCode} className="space-y-4">
                {/* Input del código */}
                <div className="space-y-2">
                  <Label className="text-slate-100" htmlFor="verification-code">
                    Código de verificación
                  </Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="verification-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="123456"
                      value={code}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setCode(value);
                        setError(null);
                      }}
                      disabled={verifying}
                      className="
                        pl-9 text-center text-lg tracking-widest
                        text-white
                        placeholder:text-slate-300
                        caret-blue-300
                        bg-white/5 border-white/10
                        focus-visible:ring-2 focus-visible:ring-blue-400
                        disabled:opacity-60 disabled:cursor-not-allowed
                      "
                      maxLength={6}
                      autoComplete="one-time-code"
                    />
                  </div>
                  <p className="text-xs text-slate-400">6 dígitos enviados por email</p>
                </div>

                {/* Botón verificar */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!canSubmit}
                >
                  {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {verifying ? "Verificando..." : "Verificar código"}
                </Button>
              </form>

              {/* Error y reenvío */}
              <div>
                <AnimatePresence>
                  {error ? (
                    <div className="text-red-400 text-sm text-center mt-2">{error}</div>
                  ) : (
                    <Button
                      type="button"
                      onClick={sendVerificationCode}
                      disabled={cooldown > 0 || sending}
                      className="w-full mt-2"
                      variant="outline"
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Reenviar código{cooldown > 0 ? ` (${cooldown}s)` : ""}
                    </Button>
                  )}
                </AnimatePresence>
                {/* Barra de progreso del cooldown */}
                {cooldown > 0 && (
                  <div className="space-y-1 mt-2">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400/70 to-cyan-300/70 transition-all duration-1000"
                        style={{ width: `${((60 - cooldown) / 60) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="w-full text-red-300 hover:text-white"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </Button>

                <Link href="/login" className="w-full">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </main>
  );
}

/* Chip reutilizable */
function InfoChip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-blue-200">
      {text}
    </span>
  );
}