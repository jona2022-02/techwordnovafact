// app/(public)/login/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification, // <-- cambiado para usar Firebase nativo
} from "firebase/auth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, Loader2, Sparkles, User } from "lucide-react";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Limpiar error y campos cuando cambia el modo
  useEffect(() => {
    setError(null);
    // Solo limpiar nombre al cambiar a login
    if (mode === "login") {
      setName("");
    }
  }, [mode]);

  // Si ya hay sesión, ir al área privada
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/home");
    });
    return () => unsub();
  }, [router]);

  const canSubmit = useMemo(() => {
    const basic = email.trim().length > 3 && pass.trim().length >= 6;
    const nameValid = mode === "login" || name.trim().length >= 2;
    return basic && nameValid && !loading;
  }, [email, pass, name, mode, loading]);

  const mapFirebaseError = (code?: string) => {
    switch (code) {
      case "auth/invalid-email":
        return "El correo no es válido.";
      case "auth/missing-password":
        return "Ingresa tu contraseña.";
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Credenciales incorrectas. Verifica tu correo y contraseña.";
      case "auth/user-not-found":
        return "No existe una cuenta con ese correo.";
      case "auth/email-already-in-use":
        return "Ya existe una cuenta con ese correo.";
      case "auth/too-many-requests":
        return "Demasiados intentos. Inténtalo más tarde.";
      case "auth/network-request-failed":
        return "Sin conexión. Revisa tu red.";
      case "auth/weak-password":
        return "La contraseña es muy débil (mínimo 6 caracteres).";
      case "auth/invalid-display-name":
        return "El nombre ingresado no es válido.";
      default:
        return "Error de autenticación. Inténtalo nuevamente.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return; // doble protección
    setLoading(true);
    setError(null);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email.trim(), pass.trim());
        toast.success("Autenticado", { description: email });
        router.replace("/home");
      } else {
        // Crear usuario
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass.trim());
        
        // Actualizar el perfil con el nombre
        await updateProfile(userCredential.user, {
          displayName: name.trim(),
        });
        
        // Enviar email de verificación usando Firebase nativo
        try {
          await sendEmailVerification(userCredential.user, {
            url: `${window.location.origin}/verify-email`, // URL de continuación
            handleCodeInApp: true,
          });
          
          toast.success("Cuenta creada", { 
            description: `¡Bienvenido ${name.trim()}! Revisa tu correo para verificar tu cuenta.` 
          });
        } catch (emailError) {
          console.error('Error enviando email de verificación:', emailError);
          toast.warning("Cuenta creada", { 
            description: "Cuenta creada, pero hubo un error enviando el correo de verificación." 
          });
        }
        
        // Redirigir a la página de verificación pendiente
        router.replace("/verify-email/pending");
      }
    } catch (err: any) {
      const msg = mapFirebaseError(err?.code);
      setError(msg);
      toast.error("No pudimos continuar", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const systemName = "NovaFact";
  const systemTagline = "Verifica y gestiona DTEs con seguridad y velocidad.";
  const systemDesc =
    "Roles (Administrador/Desarrollador), verificación por enlace, código+fecha o JSON, y reportes exportables.";

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white"
      aria-busy={loading}
    >
      {/* brillo suave de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.25),transparent_60%)]"
      />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-6 sm:gap-8 md:gap-10 p-4 sm:p-6 md:p-10 md:grid-cols-2">
        {/* LADO IZQUIERDO */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex flex-col justify-between order-2 md:order-1"
        >
          <header className="flex items-center gap-3">
            {/* Usa tu logo de /public/logo.png */}
            <Image
              src="/logo.png"
              alt={`${systemName} logo`}
              width={80}
              height={80}
              priority
              className="object-contain sm:w-[100px] sm:h-[100px]"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-semibold leading-none text-blue-200">{systemName}</h1>
              <p className="text-xs sm:text-sm text-slate-300">{systemTagline}</p>
            </div>
          </header>

          <div className="mt-8 space-y-4">
            <InfoChip text="Cifrado en tránsito y reposo" />
            <InfoChip text="Roles y permisos administrables" />
            <InfoChip text="Auditoría y trazabilidad" />
            <p className="max-w-md text-sm text-slate-300">{systemDesc}</p>
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
              <Link
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
                href="/reset-password"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </footer>
        </motion.section>

        {/* LADO DERECHO */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
          className="flex items-center order-1 md:order-2"
        >
          <Card className="w-full border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader className="space-y-2 p-4 sm:p-6">
              <CardTitle className="flex items-center justify-center gap-2 text-center text-xl sm:text-2xl font-semibold tracking-tight">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-blue-300" />
                <span className="bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent">
                  {mode === "login" ? "Bienvenido de vuelta" : "Crea tu cuenta"}
                </span>
              </CardTitle>

              <p className="text-center text-xs sm:text-sm text-slate-300">
                Ingresa tus credenciales para continuar
              </p>

              {/* switch login/registro */}
              <div className="mx-auto mt-1 inline-flex items-center rounded-full border border-white/10 bg-white/10 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => !loading && setMode("login")}
                  disabled={loading}
                  className={`rounded-full px-2 sm:px-3 py-1.5 transition ${
                    mode === "login"
                      ? "bg-white text-slate-900"
                      : "text-white/80 hover:text-white"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  onClick={() => !loading && setMode("register")}
                  disabled={loading}
                  className={`rounded-full px-2 sm:px-3 py-1.5 transition ${
                    mode === "register"
                      ? "bg-white text-slate-900"
                      : "text-white/80 hover:text-white"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Registrarse
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              <form
                onSubmit={handleSubmit}
                className="space-y-4"
                noValidate
                aria-busy={loading}
                aria-live="polite"
              >
                {/* Nombre (solo en modo registro) */}
                <AnimatePresence mode="wait">
                  {mode === "register" && (
                    <motion.div
                      key="name-field"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="space-y-2 overflow-hidden"
                    >
                      <Label className="text-slate-100" htmlFor="name">
                        Nombre completo
                      </Label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="name"
                          type="text"
                          autoComplete="name"
                          placeholder="Tu nombre completo"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={loading}
                          className="
                            pl-9
                            text-white
                            placeholder:text-slate-300
                            caret-blue-300
                            bg-white/5 border-white/10
                            focus-visible:ring-2 focus-visible:ring-blue-400
                            disabled:opacity-60 disabled:cursor-not-allowed
                          "
                          required
                          minLength={2}
                          aria-describedby={error ? "auth-error" : undefined}
                        />
                      </div>
                      <p className="text-xs text-slate-400">Mínimo 2 caracteres.</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email */}
                <div className="space-y-2">
                  <Label className="text-slate-100" htmlFor="email">
                    Correo electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="correo@dominio.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="
                        pl-9
                        text-white
                        placeholder:text-slate-300
                        caret-blue-300
                        bg-white/5 border-white/10
                        focus-visible:ring-2 focus-visible:ring-blue-400
                        disabled:opacity-60 disabled:cursor-not-allowed
                      "
                      required
                      aria-describedby={error ? "auth-error" : undefined}
                    />
                  </div>
                </div>

                {/* Contraseña */}
                <div className="space-y-2">
                  <Label className="text-slate-100" htmlFor="password">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPass ? "text" : "password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      placeholder="********"
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      minLength={6}
                      disabled={loading}
                      className="
                        pl-9 pr-10
                        text-white
                        placeholder:text-slate-300
                        caret-blue-300
                        bg-white/5 border-white/10
                        focus-visible:ring-2 focus-visible:ring-blue-400
                        disabled:opacity-60 disabled:cursor-not-allowed
                      "
                      required
                    />
                    <button
                      type="button"
                      onClick={() => !loading && setShowPass((s) => !s)}
                      disabled={loading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">Mínimo 6 caracteres.</p>
                </div>

                {/* Meta y acción */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Mantén tus datos seguros.</span>
                  <Link
                    href="/reset-password"
                    className="text-sm text-blue-300 underline underline-offset-4 hover:text-blue-200"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!canSubmit || loading}
                  aria-busy={loading}
                  aria-live="polite"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Procesando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
                </Button>

                {/* Errores */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      id="auth-error"
                      role="alert"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-center text-sm text-red-400"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Cambio de modo */}
                <p className="mt-2 text-center text-sm text-slate-300">
                  {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
                  <button
                    type="button"
                    className="text-blue-300 underline underline-offset-4 hover:text-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setMode(mode === "login" ? "register" : "login")}
                    disabled={loading}
                  >
                    {mode === "login" ? "Regístrate" : "Inicia sesión"}
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.section>
      </div>

      {/* Overlay sutil mientras carga (opcional) */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 bg-black"
          />
        )}
      </AnimatePresence>
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
