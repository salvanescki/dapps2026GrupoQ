// ============================================================
// RegisterView — Pantalla de registro de nuevo usuario
// Estética 100% consistente con LoginView (glassmorphism, tema oscuro)
// ============================================================

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  validarFormularioRegistro,
  sanitizarDatosRegistro,
  validarNombre,
  validarFormatoContrasena,
  validarConfirmacionContrasena,
} from '../utils/validaciones';
import { validarCorreo } from '../utils/validaciones';
import { registrarUsuario } from '../api/auth-api.client';
import { HttpError } from '../api/auth-api.client';
import type { ErroresValidacionRegistro } from '../types/auth.types';
import '../styles/login.css';

export function RegisterView() {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [erroresValidacion, setErroresValidacion] = useState<ErroresValidacionRegistro>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Limpiar error previo del servidor
    if (errorServidor) setErrorServidor(null);

    // Validación local completa
    const datos = { nombre, correo, contrasena, confirmarContrasena };
    const resultado = validarFormularioRegistro(datos);
    setErroresValidacion(resultado.errores);

    if (!resultado.esValido) return;

    // Sanitizar y enviar al servidor
    const datosSanitizados = sanitizarDatosRegistro(datos);
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

  // ─── Handlers de cambio con limpieza de errores ───

  const handleNombreChange = (value: string) => {
    setNombre(value);
    if (erroresValidacion.nombre) {
      setErroresValidacion((prev) => ({ ...prev, nombre: undefined }));
    }
    if (errorServidor) setErrorServidor(null);
  };

  const handleCorreoChange = (value: string) => {
    setCorreo(value);
    if (erroresValidacion.correo) {
      setErroresValidacion((prev) => ({ ...prev, correo: undefined }));
    }
    if (errorServidor) setErrorServidor(null);
  };

  const handleContrasenaChange = (value: string) => {
    setContrasena(value);
    if (erroresValidacion.contrasena) {
      setErroresValidacion((prev) => ({ ...prev, contrasena: undefined }));
    }
    if (errorServidor) setErrorServidor(null);
  };

  const handleConfirmarContrasenaChange = (value: string) => {
    setConfirmarContrasena(value);
    if (erroresValidacion.confirmarContrasena) {
      setErroresValidacion((prev) => ({ ...prev, confirmarContrasena: undefined }));
    }
    if (errorServidor) setErrorServidor(null);
  };

  // ─── Handlers de blur para validación en tiempo real ───

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
    if (confirmarContrasena) {
      const error = validarConfirmacionContrasena(contrasena, confirmarContrasena);
      if (error) {
        setErroresValidacion((prev) => ({ ...prev, confirmarContrasena: error }));
      }
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" role="main">
        {/* Header */}
        <header className="login-header">
          <div className="login-logo" aria-hidden="true">⚽</div>
          <h1 className="login-title">Football Token Marketplace</h1>
          <p className="login-subtitle">Crea tu cuenta de inversiones deportivas</p>
        </header>

        {/* Error del servidor */}
        {errorServidor && (
          <div className="error-alert" role="alert" aria-live="assertive">
            <span className="error-alert-icon" aria-hidden="true">⚠️</span>
            <span className="error-alert-message">{errorServidor}</span>
          </div>
        )}

        {/* Formulario */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {/* Campo de nombre */}
          <div className="input-group">
            <label className="input-label" htmlFor="nombre">
              <span className="input-label-icon">👤</span>
              Nombre completo
            </label>
            <input
              id="nombre"
              type="text"
              className={`input-field${erroresValidacion.nombre ? ' input-error' : ''}`}
              placeholder="Ingresa tu nombre completo"
              value={nombre}
              onChange={(e) => handleNombreChange(e.target.value)}
              onBlur={handleNombreBlur}
              disabled={cargando}
              autoComplete="name"
              aria-invalid={!!erroresValidacion.nombre}
              aria-describedby={erroresValidacion.nombre ? 'nombre-error' : undefined}
            />
            {erroresValidacion.nombre && (
              <span className="validation-message" id="nombre-error" role="alert">
                <span className="validation-icon" aria-hidden="true">✕</span>
                {erroresValidacion.nombre}
              </span>
            )}
          </div>

          {/* Campo de correo */}
          <div className="input-group">
            <label className="input-label" htmlFor="registro-correo">
              <span className="input-label-icon">📧</span>
              Correo electrónico
            </label>
            <input
              id="registro-correo"
              type="email"
              className={`input-field${erroresValidacion.correo ? ' input-error' : ''}`}
              placeholder="inversor@tokens.com"
              value={correo}
              onChange={(e) => handleCorreoChange(e.target.value)}
              onBlur={handleCorreoBlur}
              disabled={cargando}
              autoComplete="email"
              aria-invalid={!!erroresValidacion.correo}
              aria-describedby={erroresValidacion.correo ? 'registro-correo-error' : undefined}
            />
            {erroresValidacion.correo && (
              <span className="validation-message" id="registro-correo-error" role="alert">
                <span className="validation-icon" aria-hidden="true">✕</span>
                {erroresValidacion.correo}
              </span>
            )}
          </div>

          {/* Campo de contraseña */}
          <div className="input-group">
            <label className="input-label" htmlFor="registro-contrasena">
              <span className="input-label-icon">🔒</span>
              Contraseña
            </label>
            <input
              id="registro-contrasena"
              type="password"
              className={`input-field${erroresValidacion.contrasena ? ' input-error' : ''}`}
              placeholder="Mínimo 8 caracteres"
              value={contrasena}
              onChange={(e) => handleContrasenaChange(e.target.value)}
              onBlur={handleContrasenaBlur}
              disabled={cargando}
              autoComplete="new-password"
              aria-invalid={!!erroresValidacion.contrasena}
              aria-describedby={erroresValidacion.contrasena ? 'registro-contrasena-error' : undefined}
            />
            {erroresValidacion.contrasena && (
              <span className="validation-message" id="registro-contrasena-error" role="alert">
                <span className="validation-icon" aria-hidden="true">✕</span>
                {erroresValidacion.contrasena}
              </span>
            )}
          </div>

          {/* Campo de confirmar contraseña */}
          <div className="input-group">
            <label className="input-label" htmlFor="confirmar-contrasena">
              <span className="input-label-icon">🔐</span>
              Confirmar contraseña
            </label>
            <input
              id="confirmar-contrasena"
              type="password"
              className={`input-field${erroresValidacion.confirmarContrasena ? ' input-error' : ''}`}
              placeholder="Repite tu contraseña"
              value={confirmarContrasena}
              onChange={(e) => handleConfirmarContrasenaChange(e.target.value)}
              onBlur={handleConfirmarContrasenaBlur}
              disabled={cargando}
              autoComplete="new-password"
              aria-invalid={!!erroresValidacion.confirmarContrasena}
              aria-describedby={erroresValidacion.confirmarContrasena ? 'confirmar-contrasena-error' : undefined}
            />
            {erroresValidacion.confirmarContrasena && (
              <span className="validation-message" id="confirmar-contrasena-error" role="alert">
                <span className="validation-icon" aria-hidden="true">✕</span>
                {erroresValidacion.confirmarContrasena}
              </span>
            )}
          </div>

          {/* Botón de envío */}
          <button
            type="submit"
            className="login-button"
            disabled={cargando}
            id="register-submit"
          >
            <span className="login-button-content">
              {cargando && <span className="spinner" aria-hidden="true" />}
              {cargando ? 'Creando cuenta...' : 'Crear Cuenta'}
            </span>
          </button>
        </form>

        {/* Enlace a login */}
        <p className="auth-nav-link">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
            Inicia sesión aquí
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
