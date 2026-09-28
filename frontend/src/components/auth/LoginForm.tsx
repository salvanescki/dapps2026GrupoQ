import React, { useState, type FormEvent } from 'react';
import { Input } from '../ui/Input';
import { validarFormularioLogin } from '../../utils/validaciones';
import type { ResultadoValidacion } from '../../types/auth.types';

export interface LoginFormProps {
  onSubmit: (credenciales: { correo: string; contrasena: string }) => Promise<void>;
  cargando: boolean;
  onClearError?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  cargando,
  onClearError,
}) => {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [erroresValidacion, setErroresValidacion] = useState<ResultadoValidacion['errores']>({});

  const handleCorreoChange = (value: string) => {
    setCorreo(value);
    if (erroresValidacion.correo) {
      setErroresValidacion((prev) => ({ ...prev, correo: undefined }));
    }
    if (onClearError) onClearError();
  };

  const handleContrasenaChange = (value: string) => {
    setContrasena(value);
    if (erroresValidacion.contrasena) {
      setErroresValidacion((prev) => ({ ...prev, contrasena: undefined }));
    }
    if (onClearError) onClearError();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (onClearError) onClearError();

    const resultado = validarFormularioLogin({ correo, contrasena });
    setErroresValidacion(resultado.errores);

    if (!resultado.esValido) return;

    await onSubmit({ correo, contrasena });
    setContrasena('');
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {/* Campo de correo */}
      <Input
        id="correo"
        type="email"
        label="Correo electrónico"
        icon="📧"
        placeholder="inversor@tokens.com"
        value={correo}
        onChange={(e) => handleCorreoChange(e.target.value)}
        disabled={cargando}
        autoComplete="email"
        error={erroresValidacion.correo}
      />

      {/* Campo de contraseña */}
      <Input
        id="contrasena"
        type="password"
        label="Contraseña"
        icon="🔒"
        placeholder="Ingrese su contraseña"
        value={contrasena}
        onChange={(e) => handleContrasenaChange(e.target.value)}
        disabled={cargando}
        autoComplete="current-password"
        error={erroresValidacion.contrasena}
      />

      {/* Botón de envío */}
      <button
        type="submit"
        className="login-button"
        disabled={cargando}
        id="login-submit"
      >
        <span className="login-button-content">
          {cargando && <span className="spinner" aria-hidden="true" />}
          {cargando ? 'Ingresando...' : 'Ingresar a la Plataforma'}
        </span>
      </button>
    </form>
  );
};
