import React, { type FormEvent } from 'react';
import { Input } from '../ui/Input';
import { validarFormularioLogin } from '../../utils/validaciones';
import { useForm } from '../../hooks/useForm';

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
  const { values, errors, handleChange, handleSubmit, setFieldValue } = useForm({
    initialValues: { correo: '', contrasena: '' },
    validate: validarFormularioLogin,
    onFieldChange: () => {
      if (onClearError) onClearError();
    },
    onSubmit: async (credenciales) => {
      if (onClearError) onClearError();
      await onSubmit(credenciales);
      setFieldValue('contrasena', '');
    },
  });

  const onFormSubmit = (e: FormEvent) => {
    if (onClearError) onClearError();
    handleSubmit(e);
  };

  return (
    <form className="login-form" onSubmit={onFormSubmit} noValidate>
      <Input
        id="correo"
        type="email"
        label="Correo electrónico"
        placeholder="inversor@tokens.com"
        value={values.correo}
        onChange={(e) => handleChange('correo', e.target.value)}
        disabled={cargando}
        autoComplete="email"
        error={errors.correo}
      />

      <Input
        id="contrasena"
        type="password"
        label="Contraseña"
        placeholder="Ingrese su contraseña"
        value={values.contrasena}
        onChange={(e) => handleChange('contrasena', e.target.value)}
        disabled={cargando}
        autoComplete="current-password"
        error={errors.contrasena}
      />

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
