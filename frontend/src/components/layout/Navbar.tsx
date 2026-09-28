import React from 'react';
import { Link } from 'react-router-dom';
import type { NavbarProps } from '../../types/ui.types';

export const Navbar: React.FC<NavbarProps> = ({
  titulo = 'Football Token Marketplace',
  logoIcono = '⚽',
  items = [],
  onLogout,
  brandLink = '/',
}) => {
  return (
    <nav className="app-navbar home-navbar" aria-label="Navegación principal">
      <div className="app-navbar-brand home-navbar-brand">
        <Link to={brandLink} className="app-navbar-brand-link">
          <span className="app-navbar-logo home-navbar-logo" aria-hidden="true">
            {logoIcono}
          </span>
          <span className="app-navbar-title home-navbar-title">
            {titulo}
          </span>
        </Link>
      </div>

      <div className="app-navbar-actions">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            id={item.id}
            className="app-navbar-link"
          >
            {item.icon && <span aria-hidden="true">{item.icon}</span>}
            {item.label}
          </Link>
        ))}

        {onLogout && (
          <button
            className="logout-button"
            onClick={onLogout}
            id="logout-button"
            aria-label="Cerrar sesión"
          >
            🚪 Cerrar Sesión
          </button>
        )}
      </div>
    </nav>
  );
};
