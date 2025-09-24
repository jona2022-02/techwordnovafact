"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type Props = {
  id: string;
  label: string;
  accept: string;
  help?: React.ReactNode;
  loading?: boolean;
  progress?: number; // 0..100
  onFileSelected: (file: File | null) => void;
  onUpload: () => void;
  uploadText?: string;
  variant?: "primary" | "secondary";
};

export default function FileUpload({
  id, label, accept, help, loading, progress = 0,
  onFileSelected, onUpload, uploadText = "Cargar",
  variant = "primary",
}: Props) {
  return (
    <div className="space-y-3">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="file" accept={accept} onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)} disabled={loading} />
      {help && <p className="text-sm text-muted-foreground">{help}</p>}
      <div className="flex items-center gap-3">
        <Button onClick={onUpload} disabled={loading} className="w-fit" variant={variant === "secondary" ? "secondary" : "default"}>
          {loading ? "Cargando…" : uploadText}
        </Button>
        {progress > 0 && <Progress value={progress} className="w-40" />}
      </div>
    </div>
  );
}
