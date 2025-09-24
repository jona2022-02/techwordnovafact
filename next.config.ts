// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Permite completar el build aunque existan errores de ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Permite completar el build aunque existan errores de TypeScript
    ignoreBuildErrors: true,
  },
  // Configuraciones para Vercel (Next.js 15)
  serverExternalPackages: ["firebase-admin"],
  // Configuración para manejo de archivos estáticos
  images: {
    domains: [],
    unoptimized: true
  },
};

export default nextConfig;
