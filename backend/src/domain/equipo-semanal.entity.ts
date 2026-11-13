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

interface CandidatoEquipo {
  jugador: Jugador;
  cotizacion: Cotizacion;
}

const CUPOS_FORMACION_433: ReadonlyArray<readonly [PosicionJugador, number]> = [
  ['Portero', 1],
  ['Defensa', 4],
  ['Mediocampista', 3],
  ['Delantero', 3],
];

function compararCandidatos(a: CandidatoEquipo, b: CandidatoEquipo): number {
  if (b.cotizacion.valor !== a.cotizacion.valor) {
    return b.cotizacion.valor - a.cotizacion.valor;
  }
  if (b.cotizacion.score !== a.cotizacion.score) {
    return b.cotizacion.score - a.cotizacion.score;
  }
  return a.jugador.nombre.localeCompare(b.jugador.nombre, 'en');
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
      fechaGeneracion = new Date(),
    } = params;

    const elegibles = EquipoSemanal.filtrarElegibles(params);

    const seleccionados = CUPOS_FORMACION_433.flatMap(([posicion, requeridos]) =>
      EquipoSemanal.seleccionarPorPosicion(elegibles, posicion, requeridos),
    );

    const miembros = seleccionados.map((cand, indice) =>
      MiembroEquipoSemanal.crear({
        equipoSemanalId: id,
        jugadorId: cand.jugador.id,
        nombre: cand.jugador.nombre,
        equipoNombre: cand.jugador.equipo?.nombre || 'Sin Equipo',
        posicion: cand.jugador.posicion,
        cotizacion: cand.cotizacion.valor,
        score: cand.cotizacion.score,
        orden: indice + 1,
      }),
    );

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

  private static filtrarElegibles(
    params: ParametrosSeleccionEquipo,
  ): CandidatoEquipo[] {
    const { jugadoresActivos, cotizacionesPorJugador, minutosPorJugador } = params;
    const posicionesValidas = new Set<PosicionJugador>(
      CUPOS_FORMACION_433.map(([posicion]) => posicion),
    );
    const elegibles: CandidatoEquipo[] = [];

    for (const jugador of jugadoresActivos) {
      const cotizacion = cotizacionesPorJugador.get(jugador.id);
      if (!jugador.activo || !cotizacion || cotizacion.sinEstadisticas) continue;

      const minutos = minutosPorJugador.get(jugador.id) ?? 0;
      if (minutos < MINUTOS_MINIMOS_ELEGIBILIDAD) continue;
      if (!posicionesValidas.has(jugador.posicion)) continue;

      elegibles.push({ jugador, cotizacion });
    }

    return elegibles;
  }

  private static seleccionarPorPosicion(
    elegibles: CandidatoEquipo[],
    posicion: PosicionJugador,
    requeridos: number,
  ): CandidatoEquipo[] {
    const candidatos = elegibles.filter((c) => c.jugador.posicion === posicion);

    if (candidatos.length < requeridos) {
      throw new ReglaDeNegocioException(
        `No hay suficientes jugadores elegibles en la posición ${posicion} para conformar el Equipo de la Semana (requeridos: ${requeridos}, disponibles: ${candidatos.length}).`,
      );
    }

    return candidatos.sort(compararCandidatos).slice(0, requeridos);
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
    this.validarParametrosTemporalesYEstrategia();
    this.validarUnicidadDeMiembros();
    this.validarDistribucionTactica433();
  }

  private validarParametrosTemporalesYEstrategia(): void {
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
  }

  private validarUnicidadDeMiembros(): void {
    if (this._miembros?.length !== 11) {
      throw new ReglaDeNegocioException(
        `El Equipo de la Semana debe contener exactamente 11 jugadores titulares. Cantidad recibida: ${this._miembros?.length ?? 0}`,
      );
    }

    const idsVistos = new Set<string>();
    for (const miembro of this._miembros) {
      if (idsVistos.has(miembro.jugadorId)) {
        throw new ReglaDeNegocioException(
          `No pueden existir jugadores duplicados en el Equipo de la Semana. Jugador duplicado: ${miembro.jugadorId}`,
        );
      }
      idsVistos.add(miembro.jugadorId);
    }
  }

  private validarDistribucionTactica433(): void {
    const conteoPorPosicion = this._miembros.reduce(
      (acc, m) => {
        acc[m.posicion] = (acc[m.posicion] || 0) + 1;
        return acc;
      },
      {} as Record<PosicionJugador, number>,
    );

    const requisitos: ReadonlyArray<readonly [PosicionJugador, number, string]> = [
      ['Portero', 1, '1 Portero'],
      ['Defensa', 4, '4 Defensas'],
      ['Mediocampista', 3, '3 Mediocampistas'],
      ['Delantero', 3, '3 Delanteros'],
    ];

    for (const [posicion, requerido, etiqueta] of requisitos) {
      const actual = conteoPorPosicion[posicion] || 0;
      if (actual !== requerido) {
        throw new ReglaDeNegocioException(
          `La formación 4-3-3 requiere exactamente ${etiqueta}. Cantidad actual: ${actual}`,
        );
      }
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

