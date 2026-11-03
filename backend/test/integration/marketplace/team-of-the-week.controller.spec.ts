import { NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TeamOfTheWeekController } from '../../../src/controllers/team-of-the-week.controller';
import { EquipoSemanalService } from '../../../src/services/equipo-semanal.service';
import { EquipoSemanal } from '../../../src/domain/equipo-semanal.entity';
import { MiembroEquipoSemanal } from '../../../src/domain/miembro-equipo-semanal.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';
import { ROLES_KEY } from '../../../src/common/decorators/roles.decorator';

describe('TeamOfTheWeekController (Integration & Contract Tests)', () => {
  let controller: TeamOfTheWeekController;
  let mockService: any;

  const crearEquipoMock = (ano = 2026, semanaIso = 44): EquipoSemanal => {
    const miembros: MiembroEquipoSemanal[] = [];
    const posiciones: ('Portero' | 'Defensa' | 'Mediocampista' | 'Delantero')[] = [
      'Portero',
      'Defensa',
      'Defensa',
      'Defensa',
      'Defensa',
      'Mediocampista',
      'Mediocampista',
      'Mediocampista',
      'Delantero',
      'Delantero',
      'Delantero',
    ];

    for (let i = 0; i < 11; i++) {
      miembros.push(
        MiembroEquipoSemanal.crear({
          id: `m-${i + 1}`,
          equipoSemanalId: 'eq-1',
          jugadorId: `j-${i + 1}`,
          nombre: `Jugador ${i + 1}`,
          equipoNombre: 'Club FC',
          posicion: posiciones[i],
          cotizacion: 15.0 + i,
          score: 0.85,
          orden: i + 1,
        }),
      );
    }

    return EquipoSemanal.recrear({
      id: 'eq-1',
      ano,
      semanaIso,
      formacion: '4-3-3',
      estrategiaId: 'GLOBAL',
      estrategiaVersion: 'GLOBAL_v1',
      fechaGeneracion: new Date('2026-11-02T01:00:00.000Z'),
      miembros,
    });
  };

  beforeEach(() => {
    mockService = {
      obtenerVigente: jest.fn(),
      listarSemanasDisponibles: jest.fn(),
      obtenerPorSemana: jest.fn(),
      generarEquipoSemanaActual: jest.fn(),
    };

    controller = new TeamOfTheWeekController(mockService as EquipoSemanalService);
  });

  describe('US1: GET /team-of-the-week (obtenerEquipoVigente)', () => {
    it('sin equipo generado → arroja NotFoundException con mensaje en español', async () => {
      mockService.obtenerVigente.mockResolvedValue(null);

      await expect(controller.obtenerEquipoVigente()).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.obtenerEquipoVigente()).rejects.toThrow(
        'No se ha generado ningún Equipo de la Semana todavía.',
      );
    });

    it('con equipo generado → 200 con EquipoSemanalRespuestaDto completo (11 miembros, formación 4-3-3)', async () => {
      const mockEquipo = crearEquipoMock();
      mockService.obtenerVigente.mockResolvedValue(mockEquipo);

      const dto = await controller.obtenerEquipoVigente();

      expect(dto).toBeDefined();
      expect(dto.id).toBe('eq-1');
      expect(dto.ano).toBe(2026);
      expect(dto.semanaIso).toBe(44);
      expect(dto.formacion).toBe('4-3-3');
      expect(dto.miembros).toHaveLength(11);
      expect(dto.miembros[0].posicion).toBe('Portero');
      expect(dto.miembros[0].nombre).toBe('Jugador 1');
    });
  });

  describe('US1: GET /team-of-the-week/weeks (listarSemanasDisponibles)', () => {
    it('con 0 semanas → retorna array vacío', async () => {
      mockService.listarSemanasDisponibles.mockResolvedValue([]);

      const resultado = await controller.listarSemanasDisponibles();
      expect(resultado).toEqual([]);
    });

    it('con N semanas → retorna array ordenado ano DESC, semana_iso DESC', async () => {
      mockService.listarSemanasDisponibles.mockResolvedValue([
        {
          ano: 2026,
          semanaIso: 45,
          fechaGeneracion: new Date('2026-11-09T01:00:00Z'),
        },
        {
          ano: 2026,
          semanaIso: 44,
          fechaGeneracion: new Date('2026-11-02T01:00:00Z'),
        },
      ]);

      const resultado = await controller.listarSemanasDisponibles();
      expect(resultado).toHaveLength(2);
      expect(resultado[0].semanaIso).toBe(45);
      expect(resultado[1].semanaIso).toBe(44);
    });
  });

  describe('US1: GET /team-of-the-week/weeks/:year/:week (obtenerEquipoPorSemana)', () => {
    it('con semana existente → 200 con snapshot correcto', async () => {
      mockService.obtenerPorSemana.mockResolvedValue(crearEquipoMock(2026, 44));

      const dto = await controller.obtenerEquipoPorSemana(2026, 44);
      expect(dto).toBeDefined();
      expect(dto.ano).toBe(2026);
      expect(dto.semanaIso).toBe(44);
      expect(dto.miembros).toHaveLength(11);
    });

    it('con semana inexistente → arroja NotFoundException', async () => {
      mockService.obtenerPorSemana.mockResolvedValue(null);

      await expect(controller.obtenerEquipoPorSemana(2026, 99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('US5: POST /team-of-the-week/generate (generarManualmente)', () => {
    it('verifica que el endpoint requiere rol ADMIN mediante metadata de roles', () => {
      const reflector = new Reflector();
      const roles = reflector.get<string[]>(
        ROLES_KEY,
        controller.generarManualmente,
      );
      expect(roles).toEqual(['ADMIN']);
    });

    it('con usuario ADMIN y jugadores elegibles → 200 con ResumenGeneracionEquipoDto', async () => {
      mockService.generarEquipoSemanaActual.mockResolvedValue(crearEquipoMock());

      const res = await controller.generarManualmente();
      expect(res.mensaje).toBe('Equipo de la Semana generado exitosamente.');
      expect(res.equipo.miembros).toHaveLength(11);
    });

    it('segunda ejecución en la misma semana → sobrescribe y retorna éxito', async () => {
      mockService.generarEquipoSemanaActual.mockResolvedValue(crearEquipoMock());

      await controller.generarManualmente();
      await controller.generarManualmente();

      expect(mockService.generarEquipoSemanaActual).toHaveBeenCalledTimes(2);
    });

    it('con cupo insuficiente → propaga ReglaDeNegocioException con mensaje en español', async () => {
      mockService.generarEquipoSemanaActual.mockRejectedValue(
        new ReglaDeNegocioException(
          'No hay suficientes jugadores elegibles en la posición Portero para conformar el Equipo de la Semana.',
        ),
      );

      await expect(controller.generarManualmente()).rejects.toThrow(
        'No hay suficientes jugadores elegibles en la posición Portero',
      );
    });
  });
});
