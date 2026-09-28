import React from 'react';
import type { AuthLayoutProps } from '../../types/ui.types';

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  titulo = 'Football Token Marketplace',
  subtitulo = 'Accede a tu portfolio de inversiones deportivas',
  logoIcono = '⚽',
  children,
  footerContent,
  className = '',
}) => {
  return (
    <div className={`auth-page login-page ${className}`.trim()}>
      <div className="auth-card login-card" role="main">
        {/* Header */}
        <header className="auth-header login-header">
          <div className="auth-logo login-logo" aria-hidden="true">
            {logoIcono}
          </div>
          <h1 className="auth-title login-title">{titulo}</h1>
          {subtitulo && <p className="auth-subtitle login-subtitle">{subtitulo}</p>}
        </header>

        {/* Content */}
        {children}

        {/* Footer */}
        <footer className="auth-footer login-footer">
          {footerContent ?? (
            <p className="auth-footer-text login-footer-text">
              <span className="auth-footer-dot login-footer-dot" />
              Plataforma segura de inversión deportiva
            </p>
          )}
        </footer>
      </div>
    </div>
  );
};
