import { CriterioFiltroJugador } from '../../../src/domain/jugador.entity';
import { Equipo } from '../../../src/domain/equipo.entity';
import { Liga } from '../../../src/domain/liga.entity';

describe('CriterioFiltroJugador & Consistencia Relacional (US2 Unit Tests)', () => {
  it('debe inicializar valores por defecto y normalizar código de liga', () => {
    const criterio = new CriterioFiltroJugador({
      ligaCodigo: ' pl ',
    });

    expect(criterio.ligaCodigo).toBe('PL');
    expect(criterio.pagina).toBe(1);
    expect(criterio.limite).toBe(20);
    expect(criterio.offset).toBe(0);
  });

  it('debe acotar límite máximo a 50 y mínimo de página a 1', () => {
    const criterio = new CriterioFiltroJugador({
      pagina: -5,
      limite: 200,
    });

    expect(criterio.pagina).toBe(1);
    expect(criterio.limite).toBe(50);
    expect(criterio.offset).toBe(0);
  });

  it('debe calcular correctamente el offset para páginas subsiguientes', () => {
    const criterio = new CriterioFiltroJugador({
      pagina: 3,
      limite: 15,
    });

    expect(criterio.pagina).toBe(3);
    expect(criterio.limite).toBe(15);
    expect(criterio.offset).toBe(30);
  });

  describe('Validación de Pertenencia Relacional Liga - Equipo', () => {
    const ligaInglaterra = Liga.crear({
      codigo: 'PL',
      nombre: 'Premier League',
      pais: 'Inglaterra',
    });

    const ligaEspana = Liga.crear({
      codigo: 'PD',
      nombre: 'La Liga',
      pais: 'España',
    });

    const arsenal = Equipo.crear({
      externalId: 57,
      nombre: 'Arsenal FC',
      ligaId: ligaInglaterra.id,
    });

    it('debe confirmar que el equipo pertenece a su liga asociada', () => {
      expect(arsenal.perteneceALiga(ligaInglaterra.id)).toBe(true);
    });

    it('debe rechazar la pertenencia si el equipo no pertenece a dicha liga', () => {
      expect(arsenal.perteneceALiga(ligaEspana.id)).toBe(false);
      expect(arsenal.perteneceALiga('otra-liga-id')).toBe(false);
      expect(arsenal.perteneceALiga('')).toBe(false);
    });
  });
});
