'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ActionHandler() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const mode = sp.get('mode');       // 'verifyEmail' | 'resetPassword' | 'recoverEmail'...
    const oobCode = sp.get('oobCode'); // código de acción
    const continueUrl = sp.get('continueUrl') ?? '/home';

    if (!mode || !oobCode) {
      router.replace('/verify-email/error'); // o una página de error genérica
      return;
    }

    switch (mode) {
      case 'verifyEmail':
        router.replace(`/verify-email?oobCode=${encodeURIComponent(oobCode)}`);
        break;
      case 'resetPassword':
        router.replace(`/reset-password/change?oobCode=${encodeURIComponent(oobCode)}`);
        break;
      case 'recoverEmail':
        router.replace(`/verify-email/recover?oobCode=${encodeURIComponent(oobCode)}`);
        break;
      default:
        router.replace('/verify-email/error');
    }
  }, [router, sp]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-2">Redirigiendo...</span>
    </div>
  );
}

export default function ActionRouterPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando...</span>
      </div>
    }>
      <ActionHandler />
    </Suspense>
  );
}
