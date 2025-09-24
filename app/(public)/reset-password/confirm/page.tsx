// app/reset-password/confirm/page.tsx
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { Loader2, LockKeyhole } from "lucide-react";

function ResetPasswordConfirmForm() {
  const sp = useSearchParams();
  const router = useRouter();

  const oobCode = sp.get("oobCode") ?? "";
  const mode = sp.get("mode") ?? "";
  const validFlow = mode === "resetPassword" && !!oobCode;

  const [status, setStatus] = useState<"checking"|"ready"|"success"|"error">(
    validFlow ? "checking" : "error"
  );
  const [email, setEmail] = useState<string>("");
  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // 1) Validar el código y obtener el email
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!validFlow) return;
      try {
        const mail = await verifyPasswordResetCode(auth, oobCode);
        if (alive) {
          setEmail(mail);
          setStatus("ready");
        }
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => { alive = false; };
  }, [oobCode, validFlow]);

  const canSubmit = useMemo(
    () => pass1.length >= 6 && pass1 === pass2 && !loading && status === "ready",
    [pass1, pass2, loading, status]
  );

  // 2) Confirmar el reseteo con la nueva contraseña
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setMsg(null);
    try {
      await confirmPasswordReset(auth, oobCode, pass1);
      setStatus("success");
      setMsg("¡Contraseña actualizada! Redirigiendo…");
      setTimeout(() => router.replace("/login"), 1200);
    } catch (err: any) {
      setMsg("No pudimos actualizar la contraseña. El enlace pudo expirar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center px-4 py-10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.25),transparent_60%)]" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-2">
          <LockKeyhole className="h-5 w-5 text-blue-300" />
          <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent">
            Restablecer contraseña
          </h1>
        </div>

        {status === "checking" && (
          <p className="text-slate-300 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Validando enlace…
          </p>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <p className="text-slate-300">
              El enlace no es válido o ya expiró. Solicita uno nuevo.
            </p>
            <Link
              href="/reset-password"
              className="inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Enviar nuevo enlace
            </Link>
          </div>
        )}

        {status === "ready" && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <span className="opacity-70">Correo:</span> {email}
            </div>

            <div className="space-y-2">
              <label htmlFor="p1" className="text-sm text-slate-200">Nueva contraseña</label>
              <input
                id="p1"
                type="password"
                minLength={6}
                value={pass1}
                onChange={(e) => setPass1(e.target.value)}
                placeholder="********"
                className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="p2" className="text-sm text-slate-200">Confirma la nueva contraseña</label>
              <input
                id="p2"
                type="password"
                minLength={6}
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                placeholder="********"
                className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
              {pass1 && pass2 && pass1 !== pass2 && (
                <p className="text-xs text-red-400">Las contraseñas no coinciden.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…</> : "Actualizar contraseña"}
            </button>

            {msg && <p className="text-center text-sm text-slate-300">{msg}</p>}

            <p className="pt-1 text-center text-xs text-slate-400">
              ¿Recordaste tu contraseña?{" "}
              <Link href="/login" className="text-blue-300 underline underline-offset-4 hover:text-blue-200">
                Iniciar sesión
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando...</span>
      </div>
    }>
      <ResetPasswordConfirmForm />
    </Suspense>
  );
}
