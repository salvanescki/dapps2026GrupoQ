import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  obtenerEquipoVigente,
  obtenerSemanasDisponibles,
  obtenerEquipoPorSemana,
  generarEquipoManual,
} from '../../../src/api/teamOfTheWeekApi';

describe('teamOfTheWeekApi Client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const mockEquipo = {
    id: 'eq-1',
    ano: 2026,
    semanaIso: 44,
    formacion: '4-3-3',
    estrategiaId: 'GLOBAL',
    estrategiaVersion: 'GLOBAL_v1',
    fechaGeneracion: '2026-11-02T01:00:00Z',
    miembros: [
      {
        jugadorId: 'j-1',
        nombre: 'Dibu Martinez',
        equipoNombre: 'Aston Villa',
        posicion: 'Portero' as const,
        cotizacion: 12.5,
        score: 0.85,
        orden: 1,
      },
    ],
  };

  it('obtenerEquipoVigente: 200 retorna EquipoSemanalUI deserializado correctamente', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockEquipo),
    });

    const resultado = await obtenerEquipoVigente('token-123');

    expect(resultado).toEqual(mockEquipo);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/team-of-the-week',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
  });

  it('obtenerEquipoVigente: 404 retorna null', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValue({ mensaje: 'No existe equipo' }),
    });

    const resultado = await obtenerEquipoVigente('token-123');
    expect(resultado).toBeNull();
  });

  it('obtenerSemanasDisponibles: 200 retorna array de semanas disponibles', async () => {
    const semanas = [{ ano: 2026, semanaIso: 44, fechaGeneracion: '2026-11-02T01:00:00Z' }];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(semanas),
    });

    const resultado = await obtenerSemanasDisponibles('token-123');
    expect(resultado).toEqual(semanas);
  });

  it('obtenerEquipoPorSemana: 200 retorna equipo para el año y semana especificados', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockEquipo),
    });

    const resultado = await obtenerEquipoPorSemana(2026, 44, 'token-123');
    expect(resultado).toEqual(mockEquipo);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/team-of-the-week/weeks/2026/44',
      expect.any(Object),
    );
  });

  it('generarEquipoManual: 200 llama POST /team-of-the-week/generate con token', async () => {
    const respuesta = {
      mensaje: 'Equipo de la Semana generado exitosamente.',
      equipo: mockEquipo,
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(respuesta),
    });

    const resultado = await generarEquipoManual('admin-token');
    expect(resultado).toEqual(respuesta);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/team-of-the-week/generate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-token',
        }),
      }),
    );
  });

  it('propaga error si el servidor responde con 500', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ mensaje: 'Error interno' }),
    });

    await expect(obtenerEquipoVigente('token-123')).rejects.toThrow();
  });
});

