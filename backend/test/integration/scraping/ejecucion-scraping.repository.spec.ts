import { DataSource } from 'typeorm';
import { ScrapingTestDatabaseHelper } from './scraping-test-database.helper';
import { EjecucionScrapingTypeOrmRepository } from '../../../src/scraping/data-access/ejecucion-scraping.typeorm-repository';
import { EjecucionScrapingOrmEntity } from '../../../src/scraping/data-access/ejecucion-scraping.orm-entity';
import { EjecucionScraping } from '../../../src/scraping/domain/ejecucion-scraping.entity';

describe('EjecucionScrapingTypeOrmRepository (Integration Test)', () => {
  let dataSource: DataSource;
  let repository: EjecucionScrapingTypeOrmRepository;

  beforeAll(async () => {
    const started = await ScrapingTestDatabaseHelper.start();
    dataSource = started.dataSource;
    repository = new EjecucionScrapingTypeOrmRepository(
      dataSource.getRepository(EjecucionScrapingOrmEntity),
    );
  }, 90000);

  afterAll(async () => {
    await ScrapingTestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    await ScrapingTestDatabaseHelper.cleanDatabase();
  });

  it('debe guardar y recuperar una ejecución por id', async () => {
    const ejecucion = EjecucionScraping.iniciar();
    ejecucion.incrementarJugadoresProcesados(42);
    ejecucion.registrarError({
      liga: 'PL',
      jugadorNombre: 'Player Test',
      mensaje: 'Fallo simulado',
      timestamp: new Date(),
    });

    const guardada = await repository.guardar(ejecucion);
    expect(guardada.id).toBe(ejecucion.id);

    const recuperada = await repository.buscarPorId(ejecucion.id);
    expect(recuperada).not.toBeNull();
    expect(recuperada!.jugadoresProcesados).toBe(42);
    expect(recuperada!.errores).toBe(1);
    expect(recuperada!.estado).toBe('en_progreso');
    expect(recuperada!.detalle).toHaveLength(1);
    expect(recuperada!.detalle[0].jugadorNombre).toBe('Player Test');
  });

  it('debe buscar la ejecución actualmente en progreso', async () => {
    const ejecucion = EjecucionScraping.iniciar();
    await repository.guardar(ejecucion);

    const enProgreso = await repository.buscarEnProgreso();
    expect(enProgreso).not.toBeNull();
    expect(enProgreso!.id).toBe(ejecucion.id);
    expect(enProgreso!.estado).toBe('en_progreso');
  });

  it('debe buscar la última ejecución y soportar paginación', async () => {
    const primera = EjecucionScraping.reconstituir({
      id: '11111111-1111-4111-8111-111111111111',
      inicio: new Date('2026-10-01T00:00:00.000Z'),
      fin: new Date('2026-10-01T01:00:00.000Z'),
      estado: 'exitoso',
      jugadoresProcesados: 500,
      errores: 0,
      detalle: [],
    });

    const segunda = EjecucionScraping.reconstituir({
      id: '22222222-2222-4222-8222-222222222222',
      inicio: new Date('2026-10-08T00:00:00.000Z'),
      fin: new Date('2026-10-08T01:00:00.000Z'),
      estado: 'exitoso',
      jugadoresProcesados: 520,
      errores: 1,
      detalle: [],
    });

    await repository.guardar(primera);
    await repository.guardar(segunda);

    const ultima = await repository.buscarUltima();
    expect(ultima).not.toBeNull();
    expect(ultima!.id).toBe(segunda.id);

    const paginada = await repository.listarPaginado(1, 1);
    expect(paginada.total).toBe(2);
    expect(paginada.datos).toHaveLength(1);
    expect(paginada.datos[0].id).toBe(segunda.id);
  });
});
