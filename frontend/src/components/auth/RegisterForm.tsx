import React, { useState, type FormEvent } from 'react';
import { Input } from '../ui/Input';
import {
  validarFormularioRegistro,
  sanitizarDatosRegistro,
  validarNombre,
  validarCorreo,
  validarFormatoContrasena,
  validarConfirmacionContrasena,
} from '../../utils/validaciones';
import type { ErroresValidacionRegistro, SolicitudRegistroApi } from '../../types/auth.types';

export interface RegisterFormProps {
  onSubmit: (datosSanitizados: SolicitudRegistroApi) => Promise<void>;
  cargando: boolean;
  onClearError?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  cargando,
  onClearError,
}) => {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [erroresValidacion, setErroresValidacion] = useState<ErroresValidacionRegistro>({});

  const handleNombreChange = (value: string) => {
    setNombre(value);
    if (erroresValidacion.nombre) {
      setErroresValidacion((prev) => ({ ...prev, nombre: undefined }));
    }
    if (onClearError) onClearError();
  };

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

  const handleConfirmarContrasenaChange = (value: string) => {
    setConfirmarContrasena(value);
    if (erroresValidacion.confirmarContrasena) {
      setErroresValidacion((prev) => ({ ...prev, confirmarContrasena: undefined }));
    }
    if (onClearError) onClearError();
  };

  const handleNombreBlur = () => {
    const error = validarNombre(nombre);
    if (error) {
      setErroresValidacion((prev) => ({ ...prev, nombre: error }));
    }
  };

  const handleCorreoBlur = () => {
    const error = validarCorreo(correo);
    if (error) {
      setErroresValidacion((prev) => ({ ...prev, correo: error }));
    }
  };

  const handleContrasenaBlur = () => {
    const error = validarFormatoContrasena(contrasena);
    if (error) {
      setErroresValidacion((prev) => ({ ...prev, contrasena: error }));
    }
  };

  const handleConfirmarContrasenaBlur = () => {
    const error = validarConfirmacionContrasena(contrasena, confirmarContrasena);
    if (error) {
      setErroresValidacion((prev) => ({ ...prev, confirmarContrasena: error }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (onClearError) onClearError();

    const datos = { nombre, correo, contrasena, confirmarContrasena };
    const resultado = validarFormularioRegistro(datos);
    setErroresValidacion(resultado.errores);

    if (!resultado.esValido) return;

    const datosSanitizados = sanitizarDatosRegistro(datos);
    await onSubmit(datosSanitizados);
  };

  return (
    <form className="login-form register-form" onSubmit={handleSubmit} noValidate>
      <Input
        id="nombre"
        type="text"
        label="Nombre completo"
        placeholder="Juan Pérez"
        value={nombre}
        onChange={(e) => handleNombreChange(e.target.value)}
        onBlur={handleNombreBlur}
        disabled={cargando}
        autoComplete="name"
        error={erroresValidacion.nombre}
      />

      <Input
        id="correo"
        type="email"
        label="Correo electrónico"
        placeholder="inversor@tokens.com"
        value={correo}
        onChange={(e) => handleCorreoChange(e.target.value)}
        onBlur={handleCorreoBlur}
        disabled={cargando}
        autoComplete="email"
        error={erroresValidacion.correo}
      />

      <Input
        id="contrasena"
        type="password"
        label="Contraseña"
        placeholder="Mínimo 8 caracteres (A-Z, 0-9, !@#)"
        value={contrasena}
        onChange={(e) => handleContrasenaChange(e.target.value)}
        onBlur={handleContrasenaBlur}
        disabled={cargando}
        autoComplete="new-password"
        error={erroresValidacion.contrasena}
        helperText={!erroresValidacion.contrasena ? 'Debe incluir mayúscula, número y caracter especial.' : undefined}
      />

      <Input
        id="confirmarContrasena"
        type="password"
        label="Confirmar contraseña"
        placeholder="Repita su contraseña"
        value={confirmarContrasena}
        onChange={(e) => handleConfirmarContrasenaChange(e.target.value)}
        onBlur={handleConfirmarContrasenaBlur}
        disabled={cargando}
        autoComplete="new-password"
        error={erroresValidacion.confirmarContrasena}
      />

      <button
        type="submit"
        className="login-button register-button"
        disabled={cargando}
        id="register-submit"
      >
        <span className="login-button-content">
          {cargando && <span className="spinner" aria-hidden="true" />}
          {cargando ? 'Creando cuenta...' : 'Crear Cuenta'}
        </span>
      </button>
    </form>
  );
};
