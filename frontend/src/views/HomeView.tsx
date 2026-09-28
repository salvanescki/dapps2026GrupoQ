// ============================================================
// HomeView — Pantalla inicial (Dashboard del inversor)
// ============================================================

import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { AppLayout } from '../components/layout/AppLayout';
import '../styles/home.css';
import '../styles/components.css';

export function HomeView() {
  const { usuario, logout } = useAuth();

  if (!usuario) return null;

  const navbarProps = {
    titulo: 'Football Token Marketplace',
    logoIcono: '⚽',
    items: [
      {
        label: '🏃 Ver Catálogo de Jugadores',
        to: '/players',
        id: 'nav-players-catalog',
      },
    ],
    onLogout: logout,
  };

  return (
    <AppLayout navbarProps={navbarProps} className="home-page">
      {/* Contenido principal */}
      <main className="home-content">
        <div className="home-welcome-card card card-glass">
          {/* Avatar */}
          <div className="home-avatar" aria-hidden="true">
            {usuario.nombre.charAt(0).toUpperCase()}
          </div>

          {/* Saludo personalizado */}
          <h1 className="home-welcome-title">
            ¡Bienvenido de vuelta, <span className="user-name">{usuario.nombre}</span>!
          </h1>
          <p className="home-welcome-subtitle">
            Tu espacio de inversión deportiva está listo
          </p>

          {/* Status cards */}
          <div className="home-status-grid">
            <div className="status-card">
              <div className="status-card-icon">🟢</div>
              <div className="status-card-label">Estado</div>
              <div className="status-card-value status-active">
                {usuario.activo ? 'Activo' : 'Inactivo'}
              </div>
            </div>
            <div className="status-card">
              <div className="status-card-icon">⭐</div>
              <div className="status-card-label">Nivel</div>
              <div className="status-card-value status-tier">Inversor</div>
            </div>
            <div className="status-card">
              <div className="status-card-icon">📊</div>
              <div className="status-card-label">Portfolio</div>
              <div className="status-card-value">Activo</div>
            </div>
          </div>

          {/* Info del usuario */}
          <div className="home-user-info">
            <span className="home-user-info-dot" />
            <span>Sesión activa — {usuario.correo}</span>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
