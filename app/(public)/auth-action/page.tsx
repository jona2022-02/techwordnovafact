"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  CheckCircle2,
  CircleX,
  LockKeyhole,
  Mail,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

type ActionMode = "verifyEmail" | "resetPassword" | "recoverEmail";
type Status = "loading" | "success" | "error" | "input-required";

function AuthActionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const mode = searchParams.get("mode") as ActionMode;
  const oobCode = searchParams.get("oobCode");
  const continueUrl = searchParams.get("continueUrl");

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!oobCode || !mode) {
      setStatus("error");
      setMessage("Enlace inválido o expirado");
      return;
    }

    handleAction();
  }, [mode, oobCode]);

  const handleAction = async () => {
    try {
      switch (mode) {
        case "verifyEmail":
          await applyActionCode(auth, oobCode!);
          await auth.currentUser?.reload();
          setStatus("success");
          setMessage("¡Correo verificado exitosamente!");
          toast.success("Email verificado", {
            description: "Tu cuenta está ahora activa",
          });
          break;

        case "resetPassword":
          const emailForReset = await verifyPasswordResetCode(auth, oobCode!);
          setEmail(emailForReset);
          setStatus("input-required");
          setMessage("Ingresa tu nueva contraseña");
          break;

        case "recoverEmail":
          await applyActionCode(auth, oobCode!);
          setStatus("success");
          setMessage("Email recuperado exitosamente");
          break;

        default:
          setStatus("error");
          setMessage("Acción no reconocida");
      }
    } catch (error: any) {
      setStatus("error");
      setMessage(getErrorMessage(error.code));
      toast.error("Error", {
        description: getErrorMessage(error.code),
      });
    }
  };

  const handlePasswordReset = async () => {
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    try {
      await confirmPasswordReset(auth, oobCode!, password);
      setStatus("success");
      setMessage("¡Contraseña actualizada exitosamente!");
      toast.success("Contraseña cambiada", {
        description: "Ya puedes iniciar sesión con tu nueva contraseña",
      });
    } catch (error: any) {
      toast.error("Error", {
        description: getErrorMessage(error.code),
      });
    }
  };

  const getErrorMessage = (code: string) => {
    switch (code) {
      case "auth/expired-action-code":
        return "El enlace ha expirado. Solicita uno nuevo.";
      case "auth/invalid-action-code":
        return "El enlace es inválido o ya fue usado.";
      case "auth/user-disabled":
        return "Esta cuenta ha sido deshabilitada.";
      case "auth/user-not-found":
        return "No se encontró el usuario.";
      case "auth/weak-password":
        return "La contraseña es muy débil.";
      default:
        return "Ocurrió un error. Intenta nuevamente.";
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "verifyEmail":
        return "Verificación de Email";
      case "resetPassword":
        return "Restablecer Contraseña";
      case "recoverEmail":
        return "Recuperar Email";
      default:
        return "Acción de Autenticación";
    }
  };

  const getIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="w-8 h-8 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle2 className="w-8 h-8 text-green-500" />;
      case "error":
        return <CircleX className="w-8 h-8 text-red-500" />;
      case "input-required":
        return <LockKeyhole className="w-8 h-8 text-orange-500" />;
      default:
        return <Mail className="w-8 h-8 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              {getIcon()}
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              {getTitle()}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {status === "input-required" && mode === "resetPassword" && (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 text-center">
                  Establecer nueva contraseña para: <strong>{email}</strong>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repite la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                
                <Button
                  onClick={handlePasswordReset}
                  className="w-full"
                  disabled={!password || password !== confirmPassword}
                >
                  Actualizar Contraseña
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            )}

            {status !== "input-required" && (
              <div className="text-center">
                <p className="text-gray-700 mb-6">{message}</p>
                
                {status === "success" && (
                  <div className="space-y-3">
                    <Button
                      onClick={() => router.push(continueUrl || "/login")}
                      className="w-full"
                    >
                      {mode === "resetPassword" ? "Iniciar Sesión" : "Continuar"}
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                )}
                
                {status === "error" && (
                  <div className="space-y-3">
                    <Button
                      onClick={() => router.push("/login")}
                      variant="outline"
                      className="w-full"
                    >
                      <ArrowLeft className="mr-2 w-4 h-4" />
                      Volver al Login
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="text-center mt-6">
          <Link 
            href="/login" 
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Volver al inicio de sesión
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <AuthActionContent />
    </Suspense>
  );
}