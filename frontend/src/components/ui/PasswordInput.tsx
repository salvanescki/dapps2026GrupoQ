import React, { useState } from 'react';
import type { PasswordInputProps } from '../../types/ui.types';
import { Input } from './Input';

export const PasswordInput: React.FC<PasswordInputProps> = ({
  showToggle = true,
  id,
  ...props
}) => {
  const [mostrar, setMostrar] = useState(false);

  return (
    <div className="input-password-wrapper">
      <Input
        id={id}
        type={mostrar ? 'text' : 'password'}
        {...props}
      />
      {showToggle && (
        <button
          type="button"
          className="input-password-toggle"
          onClick={() => setMostrar((prev) => !prev)}
          aria-label={mostrar ? 'Ocultar contraseña' : 'Ver contraseña'}
          tabIndex={-1}
        >
          {mostrar ? '🙈' : '👁️'}
        </button>
      )}
    </div>
  );
};
