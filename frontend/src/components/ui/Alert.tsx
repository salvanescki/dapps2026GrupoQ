import React from 'react';
import type { AlertProps } from '../../types/ui.types';

export const Alert: React.FC<AlertProps> = ({
  tipo,
  mensaje,
  onCerrar,
  className = '',
  id,
}) => {
  const isError = tipo === 'error';
  const isSuccess = tipo === 'success';

  const role = isError ? 'alert' : isSuccess ? 'status' : 'region';
  const ariaLive = isError ? 'assertive' : 'polite';

  const typeClass = isError
    ? 'alert-error error-alert'
    : isSuccess
    ? 'alert-success success-alert'
    : `alert-${tipo}`;

  return (
    <div
      id={id}
      className={`alert ${typeClass} ${className}`.trim()}
      role={role}
      aria-live={ariaLive}
    >
      <span className={`${isError ? 'error-alert-message ' : isSuccess ? 'success-alert-message ' : ''}alert-message`}>
        {mensaje}
      </span>
      {onCerrar && (
        <button
          type="button"
          className="alert-close"
          onClick={onCerrar}
          aria-label="Cerrar notificación"
        >
          ✕
        </button>
      )}
    </div>
  );
};
