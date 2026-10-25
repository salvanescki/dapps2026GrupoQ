import { Injectable } from '@nestjs/common';
import { Jugador } from '../../domain/jugador.entity';

@Injectable()
export class NormalizadorJugadorService {
  public normalizarTexto(texto?: string | null): string {
    if (!texto) return '';
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public buscarCoincidencia(
    nombreWhoScored: string,
    equipoWhoScored: string | undefined,
    ligaCodigo: string,
    jugadoresLocales: Jugador[],
  ): Jugador | null {
    let normWS = this.normalizarTexto(nombreWhoScored);
    normWS = normWS.replace(/^\d+\s*/, '').trim();
    if (!normWS) return null;

    const normEquipoWS = this.normalizarTexto(equipoWhoScored);

    // 1. Coincidencia exacta de nombre
    for (const j of jugadoresLocales) {
      const normLocal = this.normalizarTexto(j.nombre);
      if (normLocal === normWS) {
        return j;
      }
    }

    // 2. Coincidencia abreviada (ej. "M. Salah" con "Mohamed Salah") o contención de apellido
    const partesWS = normWS.split(' ').filter((p) => p.length > 0);
    const apellidoWS = partesWS[partesWS.length - 1];

    if (apellidoWS && apellidoWS.length >= 3) {
      for (const j of jugadoresLocales) {
        const normLocal = this.normalizarTexto(j.nombre);
        const partesLocal = normLocal.split(' ').filter((p) => p.length > 0);
        const apellidoLocal = partesLocal[partesLocal.length - 1];

        if (apellidoLocal === apellidoWS) {
          // Si tenemos nombre de equipo, verificar coincidencia con el equipo local si está cargado
          if (normEquipoWS && j.equipo?.nombre) {
            const normEquipoLocal = this.normalizarTexto(j.equipo.nombre);
            if (
              normEquipoLocal.includes(normEquipoWS) ||
              normEquipoWS.includes(normEquipoLocal)
            ) {
              return j;
            }
          } else {
            // Si las iniciales coinciden o uno contiene al otro
            const inicialWS = partesWS[0]?.[0];
            const inicialLocal = partesLocal[0]?.[0];
            if (inicialWS && inicialLocal && inicialWS === inicialLocal) {
              return j;
            }
          }
        }
      }
    }

    return null;
  }
}
