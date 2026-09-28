import React from 'react';
import type { InputProps } from '../../types/ui.types';

export const Input: React.FC<InputProps> = ({
  id,
  label,
  icon,
  error,
  helperText,
  containerClassName = '',
  className = '',
  disabled,
  ...props
}) => {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={`input-group ${containerClassName}`.trim()}>
      {label && (
        <label className="input-label" htmlFor={id}>
          {icon && <span className="input-label-icon" aria-hidden="true">{icon}</span>}
          {label}
        </label>
      )}

      <input
        id={id}
        {...props}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={errorId}
        className={`input-field${error ? ' input-error' : ''} ${className}`.trim()}
      />

      {helperText && !error && (
        <span className="input-helper-text" id={`${id}-helper`}>
          {helperText}
        </span>
      )}

      {error && (
        <span className="validation-message" id={errorId} role="alert">
          <span className="validation-icon" aria-hidden="true">✕</span>
          {error}
        </span>
      )}
    </div>
  );
};
