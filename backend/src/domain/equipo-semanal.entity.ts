import { Jugador, PosicionJugador } from './jugador.entity';
import { Cotizacion } from './cotizacion.entity';
import { EstrategiaId, EstrategiaVersion } from './configuracion-mercado.entity';
import { MiembroEquipoSemanal } from './miembro-equipo-semanal.entity';
import { ReglaDeNegocioException } from './exceptions/regla-de-negocio.exception';
import { generarId } from '../common/utils/generar-id';

export const MINUTOS_MINIMOS_ELEGIBILIDAD = 270;

export function obtenerAnoYSemanaIso(fecha: Date = new Date()): {
  ano: number;
  semanaIso: number;
} {
  const d = new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
  );
  const diaSemana = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - diaSemana);
  const inicioAno = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semanaIso = Math.ceil(
    ((d.getTime() - inicioAno.getTime()) / 86400000 + 1) / 7,
  );
  return { ano: d.getUTCFullYear(), semanaIso };
}

export interface ParametrosSeleccionEquipo {
  id?: string;
  ano: number;
  semanaIso: number;
  estrategiaId: EstrategiaId;
  estrategiaVersion: EstrategiaVersion;
  jugadoresActivos: Jugador[];
  cotizacionesPorJugador: Map<string, Cotizacion>;
  minutosPorJugador: Map<string, number>;
  fechaGeneracion?: Date;
}

export interface EquipoSemanalProps {
  id?: string;
  ano: number;
  semanaIso: number;
  formacion?: string;
  estrategiaId: EstrategiaId;
  estrategiaVersion: EstrategiaVersion;
  fechaGeneracion?: Date;
  miembros: MiembroEquipoSemanal[];
}

export class EquipoSemanal {
  private readonly _id: string;
  private readonly _ano: number;
  private readonly _semanaIso: number;
  private readonly _formacion: string;
  private readonly _estrategiaId: EstrategiaId;
  private readonly _estrategiaVersion: EstrategiaVersion;
  private readonly _fechaGeneracion: Date;
  private readonly _miembros: MiembroEquipoSemanal[];

  private constructor(props: EquipoSemanalProps) {
    this._id = props.id || generarId();
    this._ano = props.ano;
    this._semanaIso = props.semanaIso;
    this._formacion = props.formacion || '4-3-3';
    this._estrategiaId = props.estrategiaId;
    this._estrategiaVersion = props.estrategiaVersion;
    this._fechaGeneracion = props.fechaGeneracion || new Date();
    this._miembros = [...props.miembros];

    this.validarInvariantes();
  }

  public static recrear(props: EquipoSemanalProps): EquipoSemanal {
    return new EquipoSemanal(props);
  }

  public static seleccionarOnceIdeal(
    params: ParametrosSeleccionEquipo,
  ): EquipoSemanal {
    const {
      id = generarId(),
      ano,
      semanaIso,
      estrategiaId,
      estrategiaVersion,
      jugadoresActivos,
      cotizacionesPorJugador,
      minutosPorJugador,
      fechaGeneracion = new Date(),
    } = params;

    // 1. Filtrar jugadores elegibles
    const candidatosElegibles: { jugador: Jugador; cotizacion: Cotizacion }[] = [];

    for (const jugador of jugadoresActivos) {
      if (!jugador.activo) continue;

      const cotizacion = cotizacionesPorJugador.get(jugador.id);
      if (!cotizacion) continue;
      if (cotizacion.sinEstadisticas) continue;
      if ((minutosPorJugador.get(jugador.id) ?? 0) < MINUTOS_MINIMOS_ELEGIBILIDAD) {
        continue;
      }

      const pos = jugador.posicion;
      if (
        pos !== 'Portero' &&
        pos !== 'Defensa' &&
        pos !== 'Mediocampista' &&
        pos !== 'Delantero'
      ) {
        continue;
      }

      candidatosElegibles.push({ jugador, cotizacion });
    }

    // 2. Agrupar por posición
    const porteros = candidatosElegibles.filter(
      (c) => c.jugador.posicion === 'Portero',
    );
    const defensas = candidatosElegibles.filter(
      (c) => c.jugador.posicion === 'Defensa',
    );
    const mediocampistas = candidatosElegibles.filter(
      (c) => c.jugador.posicion === 'Mediocampista',
    );
    const delanteros = candidatosElegibles.filter(
      (c) => c.jugador.posicion === 'Delantero',
    );

    // 3. Validar cupos mínimos requeridos (1, 4, 3, 3)
    if (porteros.length < 1) {
      throw new ReglaDeNegocioException(
        `No hay suficientes jugadores elegibles en la posición Portero para conformar el Equipo de la Semana (requeridos: 1, disponibles: ${porteros.length}).`,
      );
    }
    if (defensas.length < 4) {
      throw new ReglaDeNegocioException(
        `No hay suficientes jugadores elegibles en la posición Defensa para conformar el Equipo de la Semana (requeridos: 4, disponibles: ${defensas.length}).`,
      );
    }
    if (mediocampistas.length < 3) {
      throw new ReglaDeNegocioException(
        `No hay suficientes jugadores elegibles en la posición Mediocampista para conformar el Equipo de la Semana (requeridos: 3, disponibles: ${mediocampistas.length}).`,
      );
    }
    if (delanteros.length < 3) {
      throw new ReglaDeNegocioException(
        `No hay suficientes jugadores elegibles en la posición Delantero para conformar el Equipo de la Semana (requeridos: 3, disponibles: ${delanteros.length}).`,
      );
    }

    // 4. Ordenar candidatos por: valor DESC -> score DESC -> nombre ASC
    const comparador = (
      a: { jugador: Jugador; cotizacion: Cotizacion },
      b: { jugador: Jugador; cotizacion: Cotizacion },
    ): number => {
      if (b.cotizacion.valor !== a.cotizacion.valor) {
        return b.cotizacion.valor - a.cotizacion.valor;
      }
      if (b.cotizacion.score !== a.cotizacion.score) {
        return b.cotizacion.score - a.cotizacion.score;
      }
      return a.jugador.nombre.localeCompare(b.jugador.nombre, 'en');
    };

    porteros.sort(comparador);
    defensas.sort(comparador);
    mediocampistas.sort(comparador);
    delanteros.sort(comparador);

    // 5. Seleccionar los mejores de cada grupo
    const seleccionadosPorteros = porteros.slice(0, 1);
    const seleccionadosDefensas = defensas.slice(0, 4);
    const seleccionadosMedios = mediocampistas.slice(0, 3);
    const seleccionadosDelanteros = delanteros.slice(0, 3);

    // 6. Construir los miembros con orden 1..11
    const miembros: MiembroEquipoSemanal[] = [];
    let ordenActual = 1;

    for (const cand of seleccionadosPorteros) {
      miembros.push(
        MiembroEquipoSemanal.crear({
          equipoSemanalId: id,
          jugadorId: cand.jugador.id,
          nombre: cand.jugador.nombre,
          equipoNombre: cand.jugador.equipo?.nombre || 'Sin Equipo',
          posicion: cand.jugador.posicion,
          cotizacion: cand.cotizacion.valor,
          score: cand.cotizacion.score,
          orden: ordenActual++,
        }),
      );
    }

    for (const cand of seleccionadosDefensas) {
      miembros.push(
        MiembroEquipoSemanal.crear({
          equipoSemanalId: id,
          jugadorId: cand.jugador.id,
          nombre: cand.jugador.nombre,
          equipoNombre: cand.jugador.equipo?.nombre || 'Sin Equipo',
          posicion: cand.jugador.posicion,
          cotizacion: cand.cotizacion.valor,
          score: cand.cotizacion.score,
          orden: ordenActual++,
        }),
      );
    }

    for (const cand of seleccionadosMedios) {
      miembros.push(
        MiembroEquipoSemanal.crear({
          equipoSemanalId: id,
          jugadorId: cand.jugador.id,
          nombre: cand.jugador.nombre,
          equipoNombre: cand.jugador.equipo?.nombre || 'Sin Equipo',
          posicion: cand.jugador.posicion,
          cotizacion: cand.cotizacion.valor,
          score: cand.cotizacion.score,
          orden: ordenActual++,
        }),
      );
    }

    for (const cand of seleccionadosDelanteros) {
      miembros.push(
        MiembroEquipoSemanal.crear({
          equipoSemanalId: id,
          jugadorId: cand.jugador.id,
          nombre: cand.jugador.nombre,
          equipoNombre: cand.jugador.equipo?.nombre || 'Sin Equipo',
          posicion: cand.jugador.posicion,
          cotizacion: cand.cotizacion.valor,
          score: cand.cotizacion.score,
          orden: ordenActual++,
        }),
      );
    }

    return new EquipoSemanal({
      id,
      ano,
      semanaIso,
      formacion: '4-3-3',
      estrategiaId,
      estrategiaVersion,
      fechaGeneracion,
      miembros,
    });
  }

  public estaCerrada(ahora: Date = new Date()): boolean {
    const actual = obtenerAnoYSemanaIso(ahora);
    return (
      actual.ano > this._ano ||
      (actual.ano === this._ano && actual.semanaIso > this._semanaIso)
    );
  }

  public validarRegenerable(ahora: Date = new Date()): void {
    if (this.estaCerrada(ahora)) {
      throw new ReglaDeNegocioException(
        `La semana ${this._semanaIso} de ${this._ano} ya está cerrada y no puede regenerarse.`,
      );
    }
  }

  public validarInvariantes(): void {
    if (!this._ano || this._ano < 2024) {
      throw new ReglaDeNegocioException(
        `El año del equipo semanal debe ser mayor o igual a 2024. Valor recibido: ${this._ano}`,
      );
    }

    if (!this._semanaIso || this._semanaIso < 1 || this._semanaIso > 53) {
      throw new ReglaDeNegocioException(
        `La semana ISO debe estar entre 1 y 53. Valor recibido: ${this._semanaIso}`,
      );
    }

    if (this._formacion !== '4-3-3') {
      throw new ReglaDeNegocioException(
        `La formación táctica debe ser '4-3-3'. Valor recibido: ${this._formacion}`,
      );
    }

    if (!this._estrategiaId || this._estrategiaId.trim().length === 0) {
      throw new ReglaDeNegocioException(
        'El identificador de la estrategia de cotización es obligatorio.',
      );
    }

    if (!this._estrategiaVersion || this._estrategiaVersion.trim().length === 0) {
      throw new ReglaDeNegocioException(
        'La versión de la estrategia de cotización es obligatoria.',
      );
    }

    if (!this._miembros || this._miembros.length !== 11) {
      throw new ReglaDeNegocioException(
        `El Equipo de la Semana debe contener exactamente 11 jugadores titulares. Cantidad recibida: ${this._miembros ? this._miembros.length : 0}`,
      );
    }

    // Verificar duplicidad de jugadores
    const idsVistos = new Set<string>();
    for (const miembro of this._miembros) {
      if (idsVistos.has(miembro.jugadorId)) {
        throw new ReglaDeNegocioException(
          `No pueden existir jugadores duplicados en el Equipo de la Semana. Jugador duplicado: ${miembro.jugadorId}`,
        );
      }
      idsVistos.add(miembro.jugadorId);
    }

    // Verificar distribución de formación 4-3-3
    const conteoPorPosicion = this._miembros.reduce(
      (acc, m) => {
        acc[m.posicion] = (acc[m.posicion] || 0) + 1;
        return acc;
      },
      {} as Record<PosicionJugador, number>,
    );

    if (conteoPorPosicion['Portero'] !== 1) {
      throw new ReglaDeNegocioException(
        `La formación 4-3-3 requiere exactamente 1 Portero. Cantidad actual: ${conteoPorPosicion['Portero'] || 0}`,
      );
    }
    if (conteoPorPosicion['Defensa'] !== 4) {
      throw new ReglaDeNegocioException(
        `La formación 4-3-3 requiere exactamente 4 Defensas. Cantidad actual: ${conteoPorPosicion['Defensa'] || 0}`,
      );
    }
    if (conteoPorPosicion['Mediocampista'] !== 3) {
      throw new ReglaDeNegocioException(
        `La formación 4-3-3 requiere exactamente 3 Mediocampistas. Cantidad actual: ${conteoPorPosicion['Mediocampista'] || 0}`,
      );
    }
    if (conteoPorPosicion['Delantero'] !== 3) {
      throw new ReglaDeNegocioException(
        `La formación 4-3-3 requiere exactamente 3 Delanteros. Cantidad actual: ${conteoPorPosicion['Delantero'] || 0}`,
      );
    }
  }

  public get id(): string {
    return this._id;
  }

  public get ano(): number {
    return this._ano;
  }

  public get semanaIso(): number {
    return this._semanaIso;
  }

  public get formacion(): string {
    return this._formacion;
  }

  public get estrategiaId(): EstrategiaId {
    return this._estrategiaId;
  }

  public get estrategiaVersion(): EstrategiaVersion {
    return this._estrategiaVersion;
  }

  public get fechaGeneracion(): Date {
    return this._fechaGeneracion;
  }

  public get miembros(): readonly MiembroEquipoSemanal[] {
    return Object.freeze([...this._miembros]);
  }
}

