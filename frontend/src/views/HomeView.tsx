// ============================================================
// HomeView — Pantalla inicial provisoria (Dashboard del inversor)
// ============================================================

import { useAuth } from '../hooks/useAuth';
import '../styles/home.css';

export function HomeView() {
  const { usuario, logout } = useAuth();

  if (!usuario) return null;

  return (
    <div className="home-page">
      {/* Navbar */}
      <nav className="home-navbar" aria-label="Navegación principal">
        <div className="home-navbar-brand">
          <span className="home-navbar-logo" aria-hidden="true">⚽</span>
          <span className="home-navbar-title">Football Token Marketplace</span>
        </div>
        <button
          className="logout-button"
          onClick={logout}
          id="logout-button"
          aria-label="Cerrar sesión"
        >
          🚪 Cerrar Sesión
        </button>
      </nav>

      {/* Contenido principal */}
      <main className="home-content">
        <div className="home-welcome-card">
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
    </div>
  );
}
