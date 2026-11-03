import { httpRequest, HttpError } from './http-client';
import type {
  EquipoSemanalUI,
  SemanaDisponibleUI,
  ResumenGeneracionEquipoUI,
} from '../types/team-of-the-week.types';

export async function obtenerEquipoVigente(
  token?: string | null,
  signal?: AbortSignal,
): Promise<EquipoSemanalUI | null> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    return await httpRequest<EquipoSemanalUI>('/team-of-the-week', {
      method: 'GET',
      headers,
      signal,
    });
  } catch (err) {
    if (err instanceof HttpError && err.codigoEstado === 404) {
      return null;
    }
    throw err;
  }
}

export async function obtenerSemanasDisponibles(
  token?: string | null,
  signal?: AbortSignal,
): Promise<SemanaDisponibleUI[]> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return httpRequest<SemanaDisponibleUI[]>('/team-of-the-week/weeks', {
    method: 'GET',
    headers,
    signal,
  });
}

export async function obtenerEquipoPorSemana(
  ano: number,
  semanaIso: number,
  token?: string | null,
  signal?: AbortSignal,
): Promise<EquipoSemanalUI> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return httpRequest<EquipoSemanalUI>(
    `/team-of-the-week/weeks/${ano}/${semanaIso}`,
    {
      method: 'GET',
      headers,
      signal,
    },
  );
}

export async function generarEquipoManual(
  token: string,
  signal?: AbortSignal,
): Promise<ResumenGeneracionEquipoUI> {
  return httpRequest<ResumenGeneracionEquipoUI>('/team-of-the-week/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });
}

