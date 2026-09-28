import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../components/layout/AuthLayout';
import { LoginForm } from '../components/auth/LoginForm';
import { Alert } from '../components/ui/Alert';
import type { EstadoNavegacionLogin } from '../types/auth.types';
import '../styles/login.css';
import '../styles/components.css';

export function LoginView() {
  const { login, cargando, error, limpiarError } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const locationState = location.state as EstadoNavegacionLogin | null;
  const [mensajeExito, setMensajeExito] = useState<string | null>(
    locationState?.mensajeExito ?? null
  );

  const limpiarMensajeExito = () => {
    if (mensajeExito) {
      setMensajeExito(null);
      window.history.replaceState({}, '');
    }
  };

  const handleClearError = () => {
    if (error) limpiarError();
    limpiarMensajeExito();
  };

  const handleSubmit = async (credenciales: { correo: string; contrasena: string }) => {
    handleClearError();
    await login(credenciales);
  };

  return (
    <AuthLayout
      titulo="Football Token Marketplace"
      subtitulo="Accede a tu portfolio de inversiones deportivas"
    >
      {mensajeExito && (
        <Alert tipo="success" mensaje={mensajeExito} onCerrar={limpiarMensajeExito} />
      )}

      {error && <Alert tipo="error" mensaje={error} onCerrar={limpiarError} />}

      <LoginForm
        onSubmit={handleSubmit}
        cargando={cargando}
        onClearError={handleClearError}
      />

      <p className="auth-nav-link">
        ¿No tienes cuenta?{' '}
        <a
          href="/register"
          onClick={(e) => {
            e.preventDefault();
            navigate('/register');
          }}
        >
          Regístrate aquí
        </a>
      </p>
    </AuthLayout>
  );
}
