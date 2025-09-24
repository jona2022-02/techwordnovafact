// app/(public)/layout.tsx
import "@/app/globals.css";
import { Inter } from "next/font/google";
export const metadata = { title: "Fact", description: "Sistema verificador de DTEs" };
const inter = Inter({ subsets: ["latin"] });

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
