"use client";

import { Button } from "@/components/ui/button";

type Props = {
  page: number;
  total: number;     // total rows
  perPage: number;
  onPageChange: (next: number) => void;
  className?: string;
};

export default function Pagination({ page, total, perPage, onPageChange, className }: Props) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / perPage));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={!canPrev}>
        Anterior
      </Button>
      <span className="text-sm">Página {page} / {totalPages}</span>
      <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={!canNext}>
        Siguiente
      </Button>
    </div>
  );
}
