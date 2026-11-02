import type { RolUsuario } from '../types/auth.types';
import type { NavItem } from '../types/ui.types';

export function construirItemsNavegacion(rol?: RolUsuario): NavItem[] {
  const items: NavItem[] = [
    {
      label: 'Inicio',
      to: '/',
      id: 'nav-dashboard',
    },
    {
      label: 'Marketplace',
      to: '/marketplace',
      id: 'nav-marketplace',
    },
    {
      label: 'Catálogo de Jugadores',
      to: '/players',
      id: 'nav-players-catalog',
    },
    {
      label: 'Portfolio',
      to: '/portfolio',
      id: 'nav-portfolio',
    },
  ];

  if (rol === 'ADMIN') {
    items.push({
      label: 'Gobernanza',
      to: '/admin',
      id: 'nav-admin',
    });
  }

  return items;
}

export function esRutaActiva(pathname: string, itemTo: string): boolean {
  if (itemTo === '/') {
    return pathname === '/';
  }
  return pathname === itemTo || pathname.startsWith(`${itemTo}/`);
}

