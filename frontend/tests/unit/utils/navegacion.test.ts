import { describe, it, expect } from 'vitest';
import {
  construirItemsNavegacion,
  esRutaActiva,
} from '../../../src/utils/navegacion';

describe('Utilidades de navegación global por rol (navegacion.ts)', () => {
  it('retorna los 5 enlaces permanentes para USUARIO o rol undefined y oculta Gobernanza', () => {
    const itemsUsuario = construirItemsNavegacion('USUARIO');
    expect(itemsUsuario.map((i) => ({ id: i.id, to: i.to }))).toEqual([
      { id: 'nav-dashboard', to: '/' },
      { id: 'nav-marketplace', to: '/marketplace' },
      { id: 'nav-players-catalog', to: '/players' },
      { id: 'nav-portfolio', to: '/portfolio' },
      { id: 'nav-team-of-the-week', to: '/team-of-the-week' },
    ]);

    const itemsSinRol = construirItemsNavegacion(undefined);
    expect(itemsSinRol.find((i) => i.id === 'nav-admin')).toBeUndefined();
    expect(itemsSinRol).toHaveLength(5);
  });

  it('incluye Gobernanza (/admin, id="nav-admin") única y exclusivamente cuando rol === ADMIN', () => {
    const itemsAdmin = construirItemsNavegacion('ADMIN');
    expect(itemsAdmin).toHaveLength(6);
    expect(itemsAdmin[5]).toMatchObject({
      id: 'nav-admin',
      to: '/admin',
      label: 'Gobernanza',
    });
  });

  it('determina correctamente la ruta activa con esRutaActiva', () => {
    expect(esRutaActiva('/', '/')).toBe(true);
    expect(esRutaActiva('/marketplace', '/')).toBe(false);
    expect(esRutaActiva('/marketplace', '/marketplace')).toBe(true);
    expect(esRutaActiva('/marketplace/detalle', '/marketplace')).toBe(true);
    expect(esRutaActiva('/portfolio', '/players')).toBe(false);
    expect(esRutaActiva('/team-of-the-week/2026/45', '/team-of-the-week')).toBe(true);
  });
});

