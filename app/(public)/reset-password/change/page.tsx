// app/(public)/reset-password/change/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Eye, EyeOff } from 'lucide-react';

function ResetChangeForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'ready' | 'done' | 'error'>('checking');
  const [email, setEmail] = useState<string>('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  const oobCode = sp.get('oobCode') || '';

  useEffect(() => {
    if (!oobCode) { setStatus('error'); return; }
    verifyPasswordResetCode(auth, oobCode)
      .then((eml) => { setEmail(eml); setStatus('ready'); })
      .catch(() => setStatus('error'));
  }, [oobCode]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pass !== pass2 || pass.length < 6) return;
    try {
      await confirmPasswordReset(auth, oobCode, pass);
      setStatus('done');
      setTimeout(() => router.replace('/login'), 1200);
    } catch {
      setStatus('error');
    }
  };

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        {status === 'checking' && <p>Validando enlace…</p>}

        {status === 'error' && (
          <div className="space-y-3 text-center">
            <h1 className="text-xl font-semibold">Enlace no válido o expirado</h1>
            <a href="/reset-password" className="underline text-blue-300">
              Solicitar un nuevo enlace
            </a>
          </div>
        )}

        {status === 'ready' && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="text-sm text-slate-300">
              Cuenta: <span className="font-medium">{email}</span>
            </div>

            {/* Nueva contraseña */}
            <div>
              <label className="block mb-1 text-slate-200">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showPass1 ? 'text' : 'password'}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  minLength={6}
                  required
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 pr-10 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowPass1((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-white/10"
                  aria-label={showPass1 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-400">Mínimo 6 caracteres.</p>
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="block mb-1 text-slate-200">Confirmar contraseña</label>
              <div className="relative">
                <input
                  type={showPass2 ? 'text' : 'password'}
                  value={pass2}
                  onChange={(e) => setPass2(e.target.value)}
                  minLength={6}
                  required
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 pr-10 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowPass2((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-white/10"
                  aria-label={showPass2 ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                >
                  {showPass2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={pass.length < 6 || pass !== pass2}
              className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60"
            >
              Cambiar contraseña
            </button>
          </form>
        )}

        {status === 'done' && (
          <p className="text-center">¡Contraseña actualizada! Redirigiendo al inicio de sesión…</p>
        )}
      </div>
    </main>
  );
}

export default function ResetChangePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando...</span>
      </div>
    }>
      <ResetChangeForm />
    </Suspense>
  );
}
