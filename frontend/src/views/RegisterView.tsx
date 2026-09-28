// ============================================================
// RegisterView — Pantalla de registro de nuevo usuario
// Estética 100% consistente con LoginView (glassmorphism, tema oscuro)
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registrarUsuario, HttpError } from '../api/auth-api.client';
import { AuthLayout } from '../components/layout/AuthLayout';
import { RegisterForm } from '../components/auth/RegisterForm';
import { Alert } from '../components/ui/Alert';
import type { SolicitudRegistroApi } from '../types/auth.types';
import '../styles/login.css';
import '../styles/components.css';

export function RegisterView() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const handleSubmit = async (datosSanitizados: SolicitudRegistroApi) => {
    if (errorServidor) setErrorServidor(null);
    setCargando(true);

    try {
      await registrarUsuario(datosSanitizados);

      // Registro exitoso: redirigir a /login con mensaje de bienvenida
      navigate('/login', {
        state: { mensajeExito: '¡Cuenta creada exitosamente! Ya puedes iniciar sesión.' },
      });
    } catch (error) {
      if (error instanceof HttpError) {
        setErrorServidor(error.message);
      } else {
        setErrorServidor('Ocurrió un error inesperado. Por favor intenta nuevamente.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <AuthLayout
      titulo="Football Token Marketplace"
      subtitulo="Crea tu cuenta de inversor deportivo"
      logoIcono="⚽"
    >
      {/* Error del servidor */}
      {errorServidor && (
        <Alert
          tipo="error"
          mensaje={errorServidor}
          onCerrar={() => setErrorServidor(null)}
        />
      )}

      {/* Formulario Modular */}
      <RegisterForm
        onSubmit={handleSubmit}
        cargando={cargando}
        onClearError={() => setErrorServidor(null)}
      />

      {/* Enlace a login */}
      <p className="auth-nav-link">
        ¿Ya tienes una cuenta?{' '}
        <a
          href="/login"
          onClick={(e) => {
            e.preventDefault();
            navigate('/login');
          }}
        >
          Inicia sesión aquí
        </a>
      </p>
    </AuthLayout>
  );
}
