// app/(public)/reset-password/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, KeyRound, Lock, CheckCircle2, ArrowLeft, Loader2, Shield } from "lucide-react";

type Step = 'email' | 'code' | 'password' | 'success';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetKey, setResetKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Validaciones
  const canSubmitEmail = useMemo(() => {
    return email.trim().length > 3 && email.includes('@') && !loading;
  }, [email, loading]);

  const canSubmitCode = useMemo(() => {
    return code.trim().length === 6 && !loading;
  }, [code, loading]);
  const canSubmitPassword = useMemo(() => {
    return password.length >= 6 && password === confirmPassword && !loading;
  }, [password, confirmPassword, loading]);

  // Paso 1: Enviar código
  const sendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitEmail) return;
    
    setError("");
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          type: 'password-reset'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error enviando código');
      }

      if (data.key) {
        setResetKey(data.key);
      }

      setStep('code');
      toast.success('Código enviado correctamente');
      
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  // Paso 2: Verificar código
  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitCode) return;
    
    setError("");
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationCode: code.trim(),
          key: resetKey,
          type: 'password-reset'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Código incorrecto');
      }

      setStep('password');
      toast.success('Código verificado correctamente');
      
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Paso 3: Cambiar contraseña
  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitPassword) return;
    
    setError("");
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetKey,
          newPassword: password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error cambiando contraseña');
      }

      setStep('success');
      toast.success('¡Contraseña actualizada correctamente!');
      
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeInput = (value: string) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setCode(numericValue);
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.25),transparent_60%)]" />
      
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl place-items-center p-4 sm:p-6 md:p-12">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-xl">
            <CardHeader className="space-y-2 p-4 sm:p-6">
              <CardTitle className="flex items-center justify-center gap-2 text-center text-xl sm:text-2xl font-semibold">
                {step === 'email' && <Mail className="h-5 w-5 text-blue-300" />}
                {step === 'code' && <KeyRound className="h-5 w-5 text-amber-300" />}
                {step === 'password' && <Lock className="h-5 w-5 text-green-300" />}
                {step === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-300" />}
                
                <span className="bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent">
                  {step === 'email' && 'Restablecer contraseña'}
                  {step === 'code' && 'Código de verificación'}
                  {step === 'password' && 'Nueva contraseña'}
                  {step === 'success' && '¡Listo!'}
                </span>
              </CardTitle>
              <p className="text-center text-xs sm:text-sm text-slate-300">
                {step === 'email' && 'Ingresa tu correo y te enviaremos un código de 6 dígitos'}
                {step === 'code' && `Ingresa el código enviado a ${email}`}
                {step === 'password' && 'Crea una nueva contraseña segura'}
                {step === 'success' && 'Tu contraseña ha sido actualizada correctamente'}
              </p>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              
              {/* PASO 1: Email */}
              {step === 'email' && (
                <form onSubmit={sendResetCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-200">
                      Correo electrónico
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="tu@correo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 text-slate-100 placeholder:text-slate-400 bg-white/5 border-white/10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={!canSubmitEmail}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Enviando código..." : "Enviar código"}
                  </Button>

                  {error && (
                    <p className="text-sm text-red-400 text-center">{error}</p>
                  )}

                  <div className="mt-2 flex items-center justify-center gap-2 text-sm">
                    <ArrowLeft className="h-4 w-4 text-slate-400" />
                    <Link href="/login" className="text-blue-300 underline hover:text-blue-200">
                      Volver a iniciar sesión
                    </Link>
                  </div>
                </form>
              )}

              {/* PASO 2: Código */}
              {step === 'code' && (
                <form onSubmit={verifyCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-slate-200">
                      Código de verificación
                    </Label>
                    <div className="relative">
                      <Shield className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="code"
                        type="text"
                        placeholder="123456"
                        value={code}
                        onChange={(e) => handleCodeInput(e.target.value)}
                        className="pl-9 text-center text-2xl tracking-widest font-mono text-slate-100 bg-white/5 border-white/10"
                        maxLength={6}
                        required
                      />
                    </div>
                    <p className="text-xs text-slate-400 text-center">
                      El código expira en 10 minutos
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={!canSubmitCode}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Verificando..." : "Verificar código"}
                  </Button>

                  {error && (
                    <p className="text-sm text-red-400 text-center">{error}</p>
                  )}

                  <div className="flex items-center justify-center gap-4 text-sm">
                    <button
                      type="button"
                      onClick={() => setStep('email')}
                      className="text-slate-400 hover:text-slate-300 flex items-center gap-1"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Cambiar email
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => sendResetCode({ preventDefault: () => {} } as React.FormEvent)}
                      className="text-blue-300 underline hover:text-blue-200"
                      disabled={loading}
                    >
                      Reenviar código
                    </button>
                  </div>
                </form>
              )}

              {/* PASO 3: Nueva contraseña */}
              {step === 'password' && (
                <form onSubmit={resetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-200">
                      Nueva contraseña
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 text-slate-100 bg-white/5 border-white/10"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-slate-200">
                      Confirmar contraseña
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Repite la contraseña"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-9 text-slate-100 bg-white/5 border-white/10"
                        required
                      />
                    </div>
                    {password && confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-400">Las contraseñas no coinciden</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={!canSubmitPassword}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Actualizando..." : "Actualizar contraseña"}
                  </Button>

                  {error && (
                    <p className="text-sm text-red-400 text-center">{error}</p>
                  )}

                  <button
                    type="button"
                    onClick={() => setStep('code')}
                    className="w-full text-sm text-slate-400 hover:text-slate-300 flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al código
                  </button>
                </form>
              )}

              {/* PASO 4: Éxito */}
              {step === 'success' && (
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/20 ring-1 ring-emerald-400/30">
                    <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-lg font-medium">¡Contraseña actualizada!</h2>
                    <p className="text-sm text-slate-300">
                      Tu contraseña ha sido cambiada exitosamente.
                      Ya puedes iniciar sesión con tu nueva contraseña.
                    </p>
                  </div>

                  <Button onClick={() => router.push('/login')} className="w-full">
                    Ir a iniciar sesión
                  </Button>
                </div>
              )}
              
            </CardContent>
          </Card>
        </motion.div>

        <div className="mt-8 text-center text-xs text-slate-400">
          ¿Problemas para recibir el código? Revisa tu carpeta de spam.
        </div>
      </div>
    </main>
  );
}
