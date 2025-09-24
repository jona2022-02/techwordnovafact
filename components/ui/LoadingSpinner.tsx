// components/ui/LoadingSpinner.tsx
import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export const LoadingSpinner = memo(({ 
  size = 'md', 
  text, 
  className, 
  fullScreen = false 
}: LoadingSpinnerProps) => {
  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center gap-2',
      fullScreen && 'min-h-screen',
      className
    )}>
      <Loader2 
        className={cn(
          'animate-spin text-primary',
          sizeClasses[size]
        )}
        aria-hidden="true"
      />
      {text && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {text}
        </p>
      )}
      <span className="sr-only">Cargando...</span>
    </div>
  );

  return content;
});

LoadingSpinner.displayName = 'LoadingSpinner';