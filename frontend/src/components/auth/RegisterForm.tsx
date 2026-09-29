import React, { type FormEvent } from 'react';
import { Input } from '../ui/Input';
import {
  validarFormularioRegistro,
  sanitizarDatosRegistro,
  validarNombre,
  validarCorreo,
  validarFormatoContrasena,
  validarConfirmacionContrasena,
} from '../../utils/validaciones';
import type { DatosRegistro, SolicitudRegistroApi } from '../../types/auth.types';
import { useForm } from '../../hooks/useForm';

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
  const { values, errors, handleChange, handleBlur, handleSubmit } = useForm<
    DatosRegistro,
    SolicitudRegistroApi
  >({
    initialValues: {
      nombre: '',
      correo: '',
      contrasena: '',
      confirmarContrasena: '',
    },
    validate: validarFormularioRegistro,
    validateField: (name, _value, allValues) => {
      switch (name) {
        case 'nombre':
          return validarNombre(allValues.nombre);
        case 'correo':
          return validarCorreo(allValues.correo);
        case 'contrasena':
          return validarFormatoContrasena(allValues.contrasena);
        case 'confirmarContrasena':
          return validarConfirmacionContrasena(allValues.contrasena, allValues.confirmarContrasena);
        default:
          return undefined;
      }
    },
    sanitize: sanitizarDatosRegistro,
    onFieldChange: () => {
      if (onClearError) onClearError();
    },
    onSubmit: async (datosSanitizados) => {
      if (onClearError) onClearError();
      await onSubmit(datosSanitizados);
    },
  });

  const onFormSubmit = (e: FormEvent) => {
    if (onClearError) onClearError();
    handleSubmit(e);
  };

  return (
    <form className="login-form register-form" onSubmit={onFormSubmit} noValidate>
      <Input
        id="nombre"
        type="text"
        label="Nombre completo"
        placeholder="Juan Pérez"
        value={values.nombre}
        onChange={(e) => handleChange('nombre', e.target.value)}
        onBlur={() => handleBlur('nombre')}
        disabled={cargando}
        autoComplete="name"
        error={errors.nombre}
      />

      <Input
        id="correo"
        type="email"
        label="Correo electrónico"
        placeholder="inversor@tokens.com"
        value={values.correo}
        onChange={(e) => handleChange('correo', e.target.value)}
        onBlur={() => handleBlur('correo')}
        disabled={cargando}
        autoComplete="email"
        error={errors.correo}
      />

      <Input
        id="contrasena"
        type="password"
        label="Contraseña"
        placeholder="Mínimo 8 caracteres (A-Z, 0-9, !@#)"
        value={values.contrasena}
        onChange={(e) => handleChange('contrasena', e.target.value)}
        onBlur={() => handleBlur('contrasena')}
        disabled={cargando}
        autoComplete="new-password"
        error={errors.contrasena}
        helperText={!errors.contrasena ? 'Debe incluir mayúscula, número y caracter especial.' : undefined}
      />

      <Input
        id="confirmarContrasena"
        type="password"
        label="Confirmar contraseña"
        placeholder="Repita su contraseña"
        value={values.confirmarContrasena}
        onChange={(e) => handleChange('confirmarContrasena', e.target.value)}
        onBlur={() => handleBlur('confirmarContrasena')}
        disabled={cargando}
        autoComplete="new-password"
        error={errors.confirmarContrasena}
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
