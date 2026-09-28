import React from 'react';
import type { SpinnerProps } from '../../types/ui.types';

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  ariaLabel = 'Cargando...',
  className = '',
}) => {
  const sizeClass = size === 'sm' ? 'spinner-sm' : size === 'lg' ? 'spinner-lg' : 'spinner-md';

  return (
    <span
      className={`spinner ${sizeClass} ${className}`.trim()}
      role="status"
      aria-label={ariaLabel}
      aria-hidden="true"
    />
  );
};
