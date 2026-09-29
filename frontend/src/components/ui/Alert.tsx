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

  const ariaLive = isError ? 'assertive' : 'polite';

  let role = 'region';
  let typeClass = `alert-${tipo}`;
  let messageClass = '';
  if (isError) {
    role = 'alert';
    typeClass = 'alert-error error-alert';
    messageClass = 'error-alert-message ';
  } else if (isSuccess) {
    role = 'status';
    typeClass = 'alert-success success-alert';
    messageClass = 'success-alert-message ';
  }

  return (
    <div
      id={id}
      className={`alert ${typeClass} ${className}`.trim()}
      role={role}
      aria-live={ariaLive}
    >
      <span className={`${messageClass}alert-message`}>
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
