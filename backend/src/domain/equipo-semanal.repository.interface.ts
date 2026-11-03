import { EquipoSemanal } from './equipo-semanal.entity';

export const EQUIPO_SEMANAL_REPOSITORY = 'EQUIPO_SEMANAL_REPOSITORY';

export interface SemanaDisponibleResumen {
  ano: number;
  semanaIso: number;
  fechaGeneracion: Date;
}

export interface IEquipoSemanalRepository {
  guardarOSobrescribir(equipo: EquipoSemanal): Promise<void>;
  obtenerVigente(): Promise<EquipoSemanal | null>;
  obtenerPorSemana(
    ano: number,
    semanaIso: number,
  ): Promise<EquipoSemanal | null>;
  listarSemanasDisponibles(): Promise<SemanaDisponibleResumen[]>;
}
