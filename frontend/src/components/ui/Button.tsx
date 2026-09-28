import React from 'react';
import type { ButtonProps } from '../../types/ui.types';
import { Spinner } from './Spinner';

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  cargando = false,
  textoCarga,
  icono,
  disabled,
  className = '',
  ...props
}) => {
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const isDisabled = disabled || cargando;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={`btn ${variantClass} ${sizeClass} ${className}`.trim()}
    >
      <span className="btn-content">
        {cargando && <Spinner size={size === 'lg' ? 'md' : 'sm'} />}
        {!cargando && icono && <span className="btn-icon" aria-hidden="true">{icono}</span>}
        <span>{cargando && textoCarga ? textoCarga : children}</span>
      </span>
    </button>
  );
};
