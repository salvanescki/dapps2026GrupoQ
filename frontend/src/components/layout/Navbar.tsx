import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { esRutaActiva } from '../../utils/navegacion';
import type { NavbarProps } from '../../types/ui.types';

export const Navbar: React.FC<NavbarProps> = ({
  titulo = 'Football Token Marketplace',
  logoSrc = '/logo.png',
  items = [],
  onLogout,
  brandLink = '/',
}) => {
  const location = useLocation();

  return (
    <nav className="app-navbar home-navbar" aria-label="Navegación principal">
      <div className="app-navbar-brand home-navbar-brand">
        <Link to={brandLink} className="app-navbar-brand-link">
          <img src={logoSrc} alt="" className="app-navbar-logo-img" />
          <span className="app-navbar-title home-navbar-title">
            {titulo}
          </span>
        </Link>
      </div>

      <div className="app-navbar-actions">
        {items.map((item) => {
          const activa = esRutaActiva(location.pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              id={item.id}
              aria-current={activa ? 'page' : undefined}
              className={`app-navbar-link ${activa ? 'app-navbar-link-active' : ''}`.trim()}
            >
              {item.icon && <span aria-hidden="true">{item.icon}</span>}
              {item.label}
            </Link>
          );
        })}

        {onLogout && (
          <button
            className="logout-button"
            onClick={onLogout}
            id="logout-button"
            aria-label="Cerrar sesión"
          >
            Cerrar Sesión
          </button>
        )}
      </div>
    </nav>
  );
};
