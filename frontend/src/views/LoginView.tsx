// ============================================================
// LoginView — Pantalla de inicio de sesión
// ============================================================

import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { validarFormularioLogin } from '../utils/validaciones';
import type { ResultadoValidacion, EstadoNavegacionLogin } from '../types/auth.types';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/login.css';

export function LoginView() {
  const { login, cargando, error, limpiarError } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const locationState = location.state as EstadoNavegacionLogin | null;
  const [mensajeExito, setMensajeExito] = useState<string | null>(
    locationState?.mensajeExito ?? null
  );

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [erroresValidacion, setErroresValidacion] = useState<ResultadoValidacion['errores']>({});

  const limpiarMensajeExito = () => {
    if (mensajeExito) {
      setMensajeExito(null);
      // Limpiar el state de navegación para que no reaparezca al recargar
      window.history.replaceState({}, '');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Limpiar error previo del servidor
    if (error) limpiarError();
    limpiarMensajeExito();

    // Validación local
    const resultado = validarFormularioLogin({ correo, contrasena });
    setErroresValidacion(resultado.errores);

    if (!resultado.esValido) return;

    // Enviar al servidor
    await login({ correo, contrasena });

    // Limpiar contraseña tras intento (el correo se mantiene)
    setContrasena('');
  };

  const handleCorreoChange = (value: string) => {
    setCorreo(value);
    if (erroresValidacion.correo) {
      setErroresValidacion((prev) => ({ ...prev, correo: undefined }));
    }
    if (error) limpiarError();
    limpiarMensajeExito();
  };

  const handleContrasenaChange = (value: string) => {
    setContrasena(value);
    if (erroresValidacion.contrasena) {
      setErroresValidacion((prev) => ({ ...prev, contrasena: undefined }));
    }
    if (error) limpiarError();
    limpiarMensajeExito();
  };

  return (
    <div className="login-page">
      <div className="login-card" role="main">
        {/* Header */}
        <header className="login-header">
          <div className="login-logo" aria-hidden="true">⚽</div>
          <h1 className="login-title">Football Token Marketplace</h1>
          <p className="login-subtitle">Accede a tu portfolio de inversiones deportivas</p>
        </header>

        {/* Mensaje de éxito post-registro */}
        {mensajeExito && (
          <div className="success-alert" role="status" aria-live="polite">
            <span className="success-alert-icon" aria-hidden="true">✓</span>
            <span className="success-alert-message">{mensajeExito}</span>
          </div>
        )}

        {/* Error del servidor */}
        {error && (
          <div className="error-alert" role="alert" aria-live="assertive">
            <span className="error-alert-icon" aria-hidden="true">⚠️</span>
            <span className="error-alert-message">{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {/* Campo de correo */}
          <div className="input-group">
            <label className="input-label" htmlFor="correo">
              <span className="input-label-icon">📧</span>
              Correo electrónico
            </label>
            <input
              id="correo"
              type="email"
              className={`input-field${erroresValidacion.correo ? ' input-error' : ''}`}
              placeholder="inversor@tokens.com"
              value={correo}
              onChange={(e) => handleCorreoChange(e.target.value)}
              disabled={cargando}
              autoComplete="email"
              aria-invalid={!!erroresValidacion.correo}
              aria-describedby={erroresValidacion.correo ? 'correo-error' : undefined}
            />
            {erroresValidacion.correo && (
              <span className="validation-message" id="correo-error" role="alert">
                <span className="validation-icon" aria-hidden="true">✕</span>
                {erroresValidacion.correo}
              </span>
            )}
          </div>

          {/* Campo de contraseña */}
          <div className="input-group">
            <label className="input-label" htmlFor="contrasena">
              <span className="input-label-icon">🔒</span>
              Contraseña
            </label>
            <input
              id="contrasena"
              type="password"
              className={`input-field${erroresValidacion.contrasena ? ' input-error' : ''}`}
              placeholder="Ingrese su contraseña"
              value={contrasena}
              onChange={(e) => handleContrasenaChange(e.target.value)}
              disabled={cargando}
              autoComplete="current-password"
              aria-invalid={!!erroresValidacion.contrasena}
              aria-describedby={erroresValidacion.contrasena ? 'contrasena-error' : undefined}
            />
            {erroresValidacion.contrasena && (
              <span className="validation-message" id="contrasena-error" role="alert">
                <span className="validation-icon" aria-hidden="true">✕</span>
                {erroresValidacion.contrasena}
              </span>
            )}
          </div>

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

        {/* Enlace a registro */}
        <p className="auth-nav-link">
          ¿No tienes cuenta?{' '}
          <a href="/register" onClick={(e) => { e.preventDefault(); navigate('/register'); }}>
            Regístrate aquí
          </a>
        </p>

        {/* Footer */}
        <footer className="login-footer">
          <p className="login-footer-text">
            <span className="login-footer-dot" />
            Plataforma segura de inversión deportiva
          </p>
        </footer>
      </div>
    </div>
  );
}

