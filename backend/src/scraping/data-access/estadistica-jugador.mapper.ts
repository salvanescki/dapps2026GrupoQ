import { EstadisticaJugador } from '../domain/estadistica-jugador.entity';
import { EstadisticaJugadorOrmEntity } from './estadistica-jugador.orm-entity';

export class EstadisticaJugadorMapper {
  private static parseNullableNumber(val: string | number | null | undefined): number | null {
    if (val === null || val === undefined) return null;
    const num = Number(val);
    return Number.isNaN(num) ? null : num;
  }

  public static toDomain(orm: EstadisticaJugadorOrmEntity): EstadisticaJugador | null {
    if (!orm) return null;
    return EstadisticaJugador.crear({
      id: orm.id,
      jugadorId: orm.jugadorId,
      temporada: orm.temporada,
      liga: orm.liga,
      fuente: orm.fuente,
      fechaActualizacion: orm.fechaActualizacion,
      partidosJugados: orm.partidosJugados,
      minutosJugados: orm.minutosJugados,
      goles: orm.goles,
      asistencias: orm.asistencias,
      tirosPorPartido: this.parseNullableNumber(orm.tirosPorPartido),
      precisionPase: this.parseNullableNumber(orm.precisionPase),
      duelosAereosGanadosPorPartido: this.parseNullableNumber(orm.duelosAereosGanadosPorPartido),
      rating: this.parseNullableNumber(orm.rating),
      tarjetasAmarillas: orm.tarjetasAmarillas,
      tarjetasRojas: orm.tarjetasRojas,
      regatesCompletadosPorPartido: this.parseNullableNumber(orm.regatesCompletadosPorPartido),
      pasesClavePorPartido: this.parseNullableNumber(orm.pasesClavePorPartido),
      xgPorPartido: this.parseNullableNumber(orm.xgPorPartido),
      xaPorPartido: this.parseNullableNumber(orm.xaPorPartido),
      grandesOcasionesPorPartido: this.parseNullableNumber(orm.grandesOcasionesPorPartido),
      entradasPorPartido: this.parseNullableNumber(orm.entradasPorPartido),
      intercepccionesPorPartido: this.parseNullableNumber(orm.intercepccionesPorPartido),
      despejesPorPartido: this.parseNullableNumber(orm.despejesPorPartido),
      pasesPorPartido: this.parseNullableNumber(orm.pasesPorPartido),
      centrosPorPartido: this.parseNullableNumber(orm.centrosPorPartido),
      atajadas: this.parseNullableNumber(orm.atajadas),
      golesRecibidos: orm.golesRecibidos !== null && orm.golesRecibidos !== undefined ? Number(orm.golesRecibidos) : null,
      porcentajeAtajadas: this.parseNullableNumber(orm.porcentajeAtajadas),
      erroresQueGeneraronGol: orm.erroresQueGeneraronGol !== null && orm.erroresQueGeneraronGol !== undefined ? Number(orm.erroresQueGeneraronGol) : null,
      autogoles: orm.autogoles !== null && orm.autogoles !== undefined ? Number(orm.autogoles) : null,
    });
  }

  public static toOrm(domain: EstadisticaJugador): EstadisticaJugadorOrmEntity | null {
    if (!domain) return null;
    const orm = new EstadisticaJugadorOrmEntity();
    orm.id = domain.id;
    orm.jugadorId = domain.jugadorId;
    orm.temporada = domain.temporada;
    orm.liga = domain.liga;
    orm.fuente = domain.fuente;
    orm.fechaActualizacion = domain.fechaActualizacion;
    orm.partidosJugados = domain.partidosJugados;
    orm.minutosJugados = domain.minutosJugados;
    orm.goles = domain.goles;
    orm.asistencias = domain.asistencias;
    orm.tirosPorPartido = domain.tirosPorPartido;
    orm.precisionPase = domain.precisionPase;
    orm.duelosAereosGanadosPorPartido = domain.duelosAereosGanadosPorPartido;
    orm.rating = domain.rating;
    orm.tarjetasAmarillas = domain.tarjetasAmarillas;
    orm.tarjetasRojas = domain.tarjetasRojas;
    orm.regatesCompletadosPorPartido = domain.regatesCompletadosPorPartido;
    orm.pasesClavePorPartido = domain.pasesClavePorPartido;
    orm.xgPorPartido = domain.xgPorPartido;
    orm.xaPorPartido = domain.xaPorPartido;
    orm.grandesOcasionesPorPartido = domain.grandesOcasionesPorPartido;
    orm.entradasPorPartido = domain.entradasPorPartido;
    orm.intercepccionesPorPartido = domain.intercepccionesPorPartido;
    orm.despejesPorPartido = domain.despejesPorPartido;
    orm.pasesPorPartido = domain.pasesPorPartido;
    orm.centrosPorPartido = domain.centrosPorPartido;
    orm.atajadas = domain.atajadas;
    orm.golesRecibidos = domain.golesRecibidos;
    orm.porcentajeAtajadas = domain.porcentajeAtajadas;
    orm.erroresQueGeneraronGol = domain.erroresQueGeneraronGol;
    orm.autogoles = domain.autogoles;
    return orm;
  }
}
