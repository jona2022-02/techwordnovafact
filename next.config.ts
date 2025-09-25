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
  // Configuración experimental para Edge Runtime
  experimental: {
    // Configuraciones experimentales futuras aquí
  },
  // Configuración de webpack para manejar Node.js modules
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false
      };
    }
    return config;
  },
};

export default nextConfig;
