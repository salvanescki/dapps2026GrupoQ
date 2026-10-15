import { registrarHooksContextoJugadores } from './players-test.context';
import { JugadorService } from '../../src/services/jugador.service';
import { LigaTypeOrmRepository } from '../../src/data-access/liga.typeorm-repository';
import { EquipoTypeOrmRepository } from '../../src/data-access/equipo.typeorm-repository';
import { JugadorTypeOrmRepository } from '../../src/data-access/jugador.typeorm-repository';
import { Liga } from '../../src/domain/liga.entity';
import { Equipo } from '../../src/domain/equipo.entity';
import { Jugador } from '../../src/domain/jugador.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('JugadorService - Edge Cases and Error Branches (Integration)', () => {
  let jugadorService: JugadorService;
  let ligaRepo: LigaTypeOrmRepository;
  let equipoRepo: EquipoTypeOrmRepository;
  let jugadorRepo: JugadorTypeOrmRepository;

  registrarHooksContextoJugadores((contexto) => {
    ({ jugadorService, ligaRepo, equipoRepo, jugadorRepo } = contexto);
  });

  it('debe lanzar BadRequestException cuando el equipo no pertenece a la liga seleccionada', async () => {
    const ligaPL = await ligaRepo.guardar(
      Liga.crear({
        codigo: 'PL',
        nombre: 'Premier League',
        pais: 'Inglaterra',
      })
    );
    const ligaPD = await ligaRepo.guardar(
      Liga.crear({
        codigo: 'PD',
        nombre: 'La Liga',
        pais: 'Espana',
      })
    );

    const equipoArsenal = await equipoRepo.guardar(
      Equipo.crear({
        externalId: 57,
        nombre: 'Arsenal FC',
        ligaId: ligaPL.id,
      })
    );

    await expect(
      jugadorService.obtenerCatalogo({
        league: 'PD',
        teamId: equipoArsenal.id,
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('debe procesar el catalogo sin error cuando equipoId o league no existen en base de datos', async () => {
    const resultado = await jugadorService.obtenerCatalogo({
      league: 'FL1',
      teamId: '00000000-0000-0000-0000-000000000000',
    });

    expect(resultado.total).toBe(0);
    expect(resultado.items).toEqual([]);
    expect(resultado.totalPages).toBe(0);
    expect(resultado.hasMore).toBe(false);
  });

  it('debe lanzar NotFoundException al buscar por un ID inexistente', async () => {
    const idInexistente = '11111111-2222-3333-4444-555555555555';

    await expect(jugadorService.buscarPorId(idInexistente)).rejects.toThrow(
      NotFoundException
    );
  });

  it('debe buscar jugador por ID existente y retornar su DTO completo', async () => {
    const liga = await ligaRepo.guardar(
      Liga.crear({
        codigo: 'SA',
        nombre: 'Serie A',
        pais: 'Italia',
      })
    );

    const equipo = await equipoRepo.guardar(
      Equipo.crear({
        externalId: 108,
        nombre: 'Inter Milan',
        ligaId: liga.id,
      })
    );

    const jugador = await jugadorRepo.guardar(
      Jugador.crear({
        externalId: 2020,
        nombre: 'Lautaro Martínez',
        posicionOriginal: 'Centre-Forward',
        nacionalidad: 'Argentina',
        dorsal: 10,
        equipoId: equipo.id,
        ligaId: liga.id,
      })
    );

    const jugadorDto = await jugadorService.buscarPorId(jugador.id);

    expect(jugadorDto.id).toBe(jugador.id);
    expect(jugadorDto.nombre).toBe('Lautaro Martínez');
    expect(jugadorDto.posicion).toBe('Delantero');
    expect(jugadorDto.equipo.nombre).toBe('Inter Milan');
    expect(jugadorDto.liga.codigo).toBe('SA');
  });

  it('debe ejecutar sincronizarManual() retornando resumen de sincronizacion', async () => {
    const res = await jugadorService.sincronizarManual();

    expect(res).toBeDefined();
    expect(typeof res.mensaje).toBe('string');
  });
});
