import { describe, it, expect } from 'vitest';
import { construirItemsNavegacion } from '../../../src/utils/navegacion';

describe('construirItemsNavegacion con Observabilidad (T009)', () => {
  it('incluye Observabilidad (/admin/observability) si y solo si rol === ADMIN', () => {
    const itemsAdmin = construirItemsNavegacion('ADMIN');
    const observabilidadItem = itemsAdmin.find((i) => i.to === '/admin/observability');
    expect(observabilidadItem).toBeDefined();
    expect(observabilidadItem).toMatchObject({
      id: 'nav-observability',
      label: 'Observabilidad',
      to: '/admin/observability',
    });

    const itemsUsuario = construirItemsNavegacion('USUARIO');
    expect(itemsUsuario.find((i) => i.to === '/admin/observability')).toBeUndefined();

    const itemsAnonimo = construirItemsNavegacion(undefined);
    expect(itemsAnonimo.find((i) => i.to === '/admin/observability')).toBeUndefined();
  });
});
