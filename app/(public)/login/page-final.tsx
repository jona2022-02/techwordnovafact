// app/(public)/login/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, Loader2, Shield, User, ArrowRight, AlertTriangle } from "lucide-react";

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
    if (mode === "login") {
      setName("");
    }
  }, [mode]);

  // Verificar si ya está autenticado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/home");
      }
    });
    return unsubscribe;
  }, [router]);

  // Mapear errores de Firebase
  const mapFirebaseError = (errorCode: string): string => {
    const errors: Record<string, string> = {
      "auth/user-not-found": "No existe una cuenta con este correo.",
      "auth/wrong-password": "Contraseña incorrecta.",
      "auth/email-already-in-use": "Ya existe una cuenta con este correo.",
      "auth/weak-password": "La contraseña es muy débil.",
      "auth/invalid-email": "El formato del correo es incorrecto.",
      "auth/too-many-requests": "Demasiados intentos. Intenta más tarde.",
      "auth/network-request-failed": "Error de conexión. Verifica tu internet.",
      "auth/invalid-credential": "Credenciales incorrectas.",
      "auth/user-disabled": "Esta cuenta ha sido deshabilitada.",
      "auth/operation-not-allowed": "Esta operación no está permitida.",
      "auth/requires-recent-login": "Por seguridad, inicia sesión de nuevo.",
    };
    return errors[errorCode] || "Ocurrió un error inesperado.";
  };

  const canSubmit = useMemo(() => {
    if (mode === "register") {
      return name.trim().length >= 2 && email.trim() && pass.length >= 6;
    }
    return email.trim() && pass.length >= 6;
  }, [mode, name, email, pass]);

  // Password strength calculator
  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return { strength: 0, label: "Muy débil", color: "red" };
    if (password.length < 8) return { strength: 1, label: "Débil", color: "red" };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;
    
    if (score >= 4) return { strength: 3, label: "Fuerte", color: "green" };
    if (score >= 2) return { strength: 2, label: "Medio", color: "yellow" };
    return { strength: 1, label: "Débil", color: "red" };
  };

  const passwordStrength = getPasswordStrength(pass);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, pass);
        toast.success("¡Bienvenido de vuelta!");
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        if (name.trim()) {
          await updateProfile(user, { displayName: name.trim() });
        }

        await sendEmailVerification(user);
        toast.success("Cuenta creada. Revisa tu correo para verificar.");
      }

      router.push("/home");
    } catch (err: any) {
      console.error("Error de autenticación:", err);
      setError(mapFirebaseError(err.code));
      toast.error("Error en la autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />
      
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Logo Section */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 backdrop-blur-sm border border-blue-400/30 mb-4"
            >
              <Shield className="w-8 h-8 text-blue-400" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Verificador DTE
            </h1>
            <p className="text-slate-300 text-sm">
              Plataforma de verificación y gestión documental
            </p>
          </div>

          {/* Main Card */}
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
            <CardHeader className="space-y-4 pb-4">
              {/* Mode Toggle */}
              <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => !loading && setMode("login")}
                  disabled={loading}
                  className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                    mode === "login"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => !loading && setMode("register")}
                  disabled={loading}
                  className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                    mode === "register"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Registrarse
                </button>
              </div>

              <div className="text-center">
                <h2 className="text-xl font-semibold text-white">
                  {mode === "login" ? "Bienvenido de vuelta" : "Crear nueva cuenta"}
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  {mode === "login" 
                    ? "Ingresa tus credenciales para continuar"
                    : "Completa los datos para registrarte"
                  }
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Name Field (Register only) */}
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
                      <Label htmlFor="name" className="text-slate-200 text-sm font-medium">
                        Nombre completo
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="name"
                          type="text"
                          autoComplete="name"
                          placeholder="Ingresa tu nombre completo"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={loading}
                          className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400/60 focus:ring-blue-400/30 h-11"
                          required
                          minLength={2}
                        />
                      </div>
                      {name.length > 0 && name.length < 2 && (
                        <p className="text-amber-400 text-xs flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Mínimo 2 caracteres
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-200 text-sm font-medium">
                    Correo electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="correo@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400/60 focus:ring-blue-400/30 h-11"
                      required
                    />
                  </div>
                  {email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                    <p className="text-amber-400 text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Formato de correo inválido
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-200 text-sm font-medium">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPass ? "text" : "password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      placeholder="••••••••"
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      minLength={6}
                      disabled={loading}
                      className="pl-10 pr-10 bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400/60 focus:ring-blue-400/30 h-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => !loading && setShowPass(!showPass)}
                      disabled={loading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 transition-colors"
                      aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPass ? 
                        <EyeOff className="h-4 w-4 text-slate-400" /> : 
                        <Eye className="h-4 w-4 text-slate-400" />
                      }
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {pass.length > 0 && (
                    <div className="space-y-1">
                      {pass.length < 6 ? (
                        <p className="text-amber-400 text-xs flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Mínimo 6 caracteres
                        </p>
                      ) : mode === "register" && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-300 ${
                                  passwordStrength.color === "green" ? "bg-green-500" :
                                  passwordStrength.color === "yellow" ? "bg-yellow-500" : "bg-red-500"
                                }`}
                                style={{ width: `${(passwordStrength.strength / 3) * 100}%` }}
                              />
                            </div>
                            <span className={`text-xs ${
                              passwordStrength.color === "green" ? "text-green-400" :
                              passwordStrength.color === "yellow" ? "text-yellow-400" : "text-red-400"
                            }`}>
                              {passwordStrength.label}
                            </span>
                          </div>
                          {passwordStrength.strength < 3 && (
                            <p className="text-slate-400 text-xs">
                              Usa mayúsculas, números y símbolos para mayor seguridad
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Forgot Password Link (Login only) */}
                {mode === "login" && (
                  <div className="text-right">
                    <Link
                      href="/reset-password"
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      {mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                {/* Error Display */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                    >
                      <p className="text-red-400 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Mode Switch */}
                <div className="text-center">
                  <p className="text-slate-400 text-sm">
                    {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
                    <button
                      type="button"
                      className="text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:opacity-50"
                      onClick={() => setMode(mode === "login" ? "register" : "login")}
                      disabled={loading}
                    >
                      {mode === "login" ? "Regístrate aquí" : "Inicia sesión"}
                    </button>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-slate-400 text-xs">
              © 2024 Verificador DTE. Todos los derechos reservados.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <div className="bg-white/10 backdrop-blur-xl rounded-lg p-6 border border-white/20">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                <span className="text-white font-medium">Procesando...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}