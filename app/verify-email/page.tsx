// app/verify-email/page.tsx
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

import { motion } from "framer-motion";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  CircleX,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

type Status = "pending" | "ok" | "error" | "invalid";

function VerifyEmailForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("pending");
  const [message, setMessage] = useState("Verificando tu correo…");

  const oobCode = useMemo(() => sp.get("oobCode"), [sp]);
  const mode = useMemo(() => sp.get("mode"), [sp]); // por ejemplo "verifyEmail"

  useEffect(() => {
    // Validación básica de query
    if (!oobCode || mode !== "verifyEmail") {
      setStatus("invalid");
      setMessage("Enlace no válido.");
      return;
    }

    // Aplica el código de verificación
    applyActionCode(auth, oobCode)
      .then(async () => {
        // Refresca estado del usuario si está autenticado
        await auth.currentUser?.reload();
        setStatus("ok");
        setMessage("¡Correo verificado con éxito! Tu cuenta está activa.");
        toast.success("Email verificado", {
          description: "Ya puedes acceder a todas las funciones",
        });
        // Redirige en ~2s: si hay sesión -> /home; si no -> /login
        setTimeout(() => {
          if (auth.currentUser) router.replace("/home");
          else router.replace("/login");
        }, 2000);
      })
      .catch(() => {
        setStatus("error");
        setMessage(
          "No pudimos verificar tu correo. El enlace puede haber expirado."
        );
        toast.error("Error de verificación", {
          description: "Solicita un nuevo enlace",
        });
      });
  }, [oobCode, mode, router]);

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
              <CardTitle className="flex items-center justify-center gap-2 text-center text-2xl font-semibold">
                <Sparkles className="h-5 w-5 text-blue-300" />
                <span className="bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent">
                  Verificación de correo
                </span>
              </CardTitle>
              <p className="text-center text-sm text-slate-300">
                Procesaremos el enlace y actualizaremos tu cuenta.
              </p>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {/* Estado visual */}
              <div className="mb-4 flex items-center justify-center">
                {status === "pending" && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Verificando…</span>
                  </div>
                )}

                {status === "ok" && (
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="h-6 w-6" />
                    <span>¡Listo!</span>
                  </div>
                )}

                {(status === "error" || status === "invalid") && (
                  <div className="flex items-center gap-2 text-rose-300">
                    <CircleX className="h-6 w-6" />
                    <span>Error</span>
                  </div>
                )}
              </div>

              <p className="mb-6 text-center text-sm text-slate-300">{message}</p>

              {/* Acciones según estado */}
              <div className="flex flex-col gap-2">
                {status === "ok" ? (
                  <Button
                    className="w-full"
                    onClick={() =>
                      router.replace(auth.currentUser ? "/home" : "/login")
                    }
                  >
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : status === "pending" ? (
                  <Button className="w-full" disabled>
                    Procesando…
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => router.replace("/verify-email/pending")}
                    >
                      Solicitar nuevo enlace
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => router.replace("/login")}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Volver a iniciar sesión
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="mt-8 text-center text-xs text-slate-400">
          ¿Problemas con el enlace? Verifica que abres el correo en este dispositivo y que
          el dominio está permitido.
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando...</span>
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}
