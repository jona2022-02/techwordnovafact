import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // base shadcn
        "flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base md:text-sm shadow-xs outline-none",
        "transition-[color,box-shadow] bg-transparent border-input",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",

        // ✅ legibilidad en dark/OSCURO
        "text-white placeholder:text-slate-300 caret-blue-300",
        // fondo/borde sutil para dark
        "bg-white/5 border-white/10",

        // foco y errores
        "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",

        className
      )}
      {...props}
    />
  );
}

export { Input };
