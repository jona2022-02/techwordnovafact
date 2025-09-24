// app/reset-password/page.tsx
"use client";

import { useMemo, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Loader2, CheckCircle2, ArrowLeft, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && !sending;
  }, [email, sending]);

  const mapFirebaseError = (code?: string) => {
    switch (code) {
      case "auth/invalid-email":
        return "El correo no es válido.";
      case "auth/user-not-found":
        return "No existe una cuenta con ese correo.";
      case "auth/missing-email":
        return "Ingresa tu correo.";
      case "auth/too-many-requests":
        return "Demasiados intentos. Intenta más tarde.";
      case "auth/network-request-failed":
        return "Sin conexión. Revisa tu red.";
      default:
        return "No se pudo enviar el correo. Intenta nuevamente.";
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setErr(null);
    setSending(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setOk(true);
    } catch (e: any) {
      setErr(mapFirebaseError(e?.code));
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* brillo suave de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.25),transparent_60%)]"
      />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl place-items-center p-4 sm:p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-xl">
            <CardHeader className="space-y-2 p-4 sm:p-6">
              <CardTitle className="flex items-center justify-center gap-2 text-center text-xl sm:text-2xl font-semibold">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-blue-300" />
                <span className="bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent">
                  Restablecer contraseña
                </span>
              </CardTitle>
              <p className="text-center text-xs sm:text-sm text-slate-300">
                Ingresa tu correo y te enviaremos un enlace para restablecerla.
              </p>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {!ok ? (
                <form onSubmit={onSubmit} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-200">
                      Correo electrónico
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="tu@correo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="
                          pl-9
                          text-slate-100 placeholder:text-slate-400
                          caret-blue-300
                          bg-white/5 border-white/10
                          focus-visible:ring-2 focus-visible:ring-blue-400
                        "
                        aria-describedby={err ? "reset-error" : undefined}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={!canSubmit}>
                    {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {sending ? "Enviando…" : "Enviar enlace"}
                  </Button>

                  {err && (
                    <p id="reset-error" role="alert" className="text-sm text-red-400 text-center">
                      {err}
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-center gap-2 text-sm">
                    <ArrowLeft className="h-4 w-4 text-slate-400" />
                    <Link
                      href="/login"
                      className="text-blue-300 underline underline-offset-4 hover:text-blue-200"
                    >
                      Volver a iniciar sesión
                    </Link>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/20 ring-1 ring-emerald-400/30">
                    <CheckCircle2 className="h-7 w-7 text-emerald-300" />
                  </div>
                  <h2 className="text-lg font-medium">¡Correo enviado!</h2>
                  <p className="text-sm text-slate-300">
                    Te enviamos un enlace a <span className="font-medium text-blue-200">{email}</span>.
                    Revisa tu bandeja (o spam) y sigue las instrucciones.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link href="/login">
                      <Button className="w-full">Ir a iniciar sesión</Button>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setOk(false)}
                      className="text-sm text-blue-300 underline underline-offset-4 hover:text-blue-200"
                      aria-label="Usar otro correo"
                    >
                      Usar otro correo
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="mt-8 text-center text-xs text-slate-400">
          ¿Problemas para recibir el correo? Agrega nuestro remitente a tu libreta o marca como
          “No es spam”.
        </div>
      </div>
    </main>
  );
}
