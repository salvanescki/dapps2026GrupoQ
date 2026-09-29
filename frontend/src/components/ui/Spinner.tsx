import React from 'react';
import type { SpinnerProps } from '../../types/ui.types';

const CLASES_TAMANO: Record<string, string> = {
  sm: 'spinner-sm',
  md: 'spinner-md',
  lg: 'spinner-lg',
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  ariaLabel = 'Cargando...',
  className = '',
}) => {
  const sizeClass = CLASES_TAMANO[size] ?? CLASES_TAMANO.md;

  return (
    <output
      className={`spinner ${sizeClass} ${className}`.trim()}
      aria-label={ariaLabel}
      aria-hidden="true"
    />
  );
};
