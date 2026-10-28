import { Injectable } from '@nestjs/common';
import { Jugador } from '../../domain/jugador.entity';

@Injectable()
export class NormalizadorJugadorService {
  private static readonly ALIAS_CLUBES: Record<string, string[]> = {
    // Premier League
    'manchester united': ['man utd', 'manchester united', 'man united', 'man u', 'mu', 'manchester united fc'],
    'manchester city': ['man city', 'manchester city', 'mancity', 'city', 'manchester city fc'],
    'arsenal': ['arsenal', 'the gunners', 'arsenal fc'],
    'chelsea': ['chelsea', 'the blues', 'chelsea fc'],
    'liverpool': ['liverpool', 'reds', 'liverpool fc'],
    'tottenham hotspur': ['tottenham', 'spurs', 'tottenham hotspur', 'tottenham hotspur fc'],
    'newcastle united': ['newcastle', 'newcastle united', 'newcastle united fc'],
    'aston villa': ['aston villa', 'villa', 'aston villa fc'],
    'brighton and hove albion': ['brighton', 'brighton hove', 'brighton and hove albion', 'brighton & hove albion fc', 'bha'],
    'wolverhampton wanderers': ['wolves', 'wolverhampton', 'wolverhampton wanderers', 'wolverhampton wanderers fc'],
    'west ham united': ['west ham', 'west ham united', 'west ham united fc'],
    'crystal palace': ['crystal palace', 'palace', 'crystal palace fc'],
    'everton': ['everton', 'everton fc'],
    'nottingham forest': ['nottingham forest', 'nottingham', 'forest', 'nottingham forest fc'],
    'brentford': ['brentford', 'brentford fc'],
    'bournemouth': ['bournemouth', 'afc bournemouth'],
    'fulham': ['fulham', 'fulham fc'],
    'ipswich town': ['ipswich', 'ipswich town', 'ipswich town fc'],
    'leicester city': ['leicester', 'leicester city', 'leicester city fc'],
    'southampton': ['southampton', 'southampton fc'],

    // LaLiga
    'real madrid': ['real madrid', 'los blancos', 'real madrid cf'],
    'barcelona': ['barcelona', 'fc barcelona', 'barca'],
    'atletico madrid': ['atletico', 'atletico de madrid', 'club atletico de madrid', 'atleti', 'atletico madrid'],
    'athletic club': ['athletic', 'athletic club', 'bilbao', 'athletic bilbao'],
    'real sociedad': ['real sociedad', 'sociedad', 'real sociedad de futbol'],
    'real betis': ['real betis', 'betis', 'betis balompie', 'real betis balompie'],
    'sevilla': ['sevilla', 'sevilla fc'],
    'villarreal': ['villarreal', 'villarreal cf'],
    'valencia': ['valencia', 'valencia cf'],
    'celta vigo': ['celta', 'celta vigo', 'rc celta de vigo', 'celta de vigo'],
    'osasuna': ['osasuna', 'ca osasuna'],
    'mallorca': ['mallorca', 'rcd mallorca'],
    'rayo vallecano': ['rayo', 'rayo vallecano', 'rayo vallecano de madrid'],
    'getafe': ['getafe', 'getafe cf'],
    'girona': ['girona', 'girona fc'],
    'espanyol': ['espanyol', 'rcd espanyol', 'rcd espanyol de barcelona'],
    'alaves': ['alaves', 'deportivo alaves'],
    'las palmas': ['las palmas', 'ud las palmas'],
    'leganes': ['leganes', 'cd leganes'],
    'valladolid': ['valladolid', 'real valladolid', 'real valladolid cf'],

    // Serie A
    'internazionale': ['inter', 'inter milan', 'internazionale', 'fc internazionale milano'],
    'ac milan': ['milan', 'ac milan'],
    'juventus': ['juventus', 'juve', 'juventus fc'],
    'napoli': ['napoli', 'ssc napoli'],
    'roma': ['roma', 'as roma'],
    'lazio': ['lazio', 'ss lazio'],
    'atalanta': ['atalanta', 'atalanta bc'],
    'fiorentina': ['fiorentina', 'acf fiorentina'],
    'bologna': ['bologna', 'bologna fc', 'bologna fc 1909'],
    'torino': ['torino', 'torino fc'],
    'monza': ['monza', 'ac monza'],
    'genoa': ['genoa', 'genoa cfc'],
    'udinese': ['udinese', 'udinese calcio'],
    'verona': ['verona', 'hellas verona', 'hellas'],
    'cagliari': ['cagliari', 'cagliari calcio'],
    'empoli': ['empoli', 'empoli fc'],
    'lecce': ['lecce', 'us lecce'],
    'parma': ['parma', 'parma calcio 1913'],
    'como': ['como', 'como 1907'],
    'venezia': ['venezia', 'venezia fc'],

    // Bundesliga
    'bayern munich': ['bayern', 'bayern munich', 'fc bayern munchen', 'bayern munchen'],
    'borussia dortmund': ['dortmund', 'borussia dortmund', 'bvb'],
    'bayer leverkusen': ['leverkusen', 'bayer leverkusen', 'bayer 04 leverkusen'],
    'rb leipzig': ['leipzig', 'rb leipzig', 'rasenballsport leipzig'],
    'eintracht frankfurt': ['frankfurt', 'eintracht frankfurt', 'eintracht'],
    'vfb stuttgart': ['stuttgart', 'vfb stuttgart'],
    'borussia monchengladbach': ['gladbach', 'monchengladbach', 'borussia monchengladbach', 'borussia m gladbach'],
    'wolfsburg': ['wolfsburg', 'vfl wolfsburg'],
    'freiburg': ['freiburg', 'sc freiburg'],
    'augsburg': ['augsburg', 'fc augsburg'],
    'werder bremen': ['bremen', 'werder bremen', 'sv werder bremen'],
    'union berlin': ['union berlin', '1 fc union berlin'],
    'mainz': ['mainz', 'mainz 05', '1 fsv mainz 05'],
    'hoffenheim': ['hoffenheim', 'tsg hoffenheim', 'tsg 1899 hoffenheim'],
    'heidenheim': ['heidenheim', '1 fc heidenheim', '1 fc heidenheim 1846'],
    'st pauli': ['st pauli', 'fc st pauli'],
    'holstein kiel': ['holstein kiel', 'kiel'],
    'bochum': ['bochum', 'vfl bochum', 'vfl bochum 1848'],

    // Ligue 1
    'paris saint germain': ['psg', 'paris saint germain', 'paris', 'paris sg', 'paris saint germain fc'],
    'marseille': ['marseille', 'om', 'olympique de marseille'],
    'monaco': ['monaco', 'as monaco', 'as monaco fc'],
    'lyon': ['lyon', 'ol', 'olympique lyonnais'],
    'lille': ['lille', 'losc', 'lille osc'],
    'rennes': ['rennes', 'stade rennais', 'stade rennais fc', 'stade rennais fc 1901'],
    'nice': ['nice', 'ogc nice'],
    'lens': ['lens', 'rc lens', 'racing club de lens'],
    'toulouse': ['toulouse', 'toulouse fc'],
    'reims': ['reims', 'stade de reims'],
    'strasbourg': ['strasbourg', 'rc strasbourg', 'rc strasbourg alsace'],
    'brest': ['brest', 'stade brestois', 'stade brestois 29'],
    'montpellier': ['montpellier', 'montpellier hsc'],
    'nantes': ['nantes', 'fc nantes'],
    'auxerre': ['auxerre', 'aj auxerre'],
    'angers': ['angers', 'angers sco'],
    'saint etienne': ['saint etienne', 'as saint etienne', 'asse'],
    'le havre': ['le havre', 'le havre ac'],
  };

  public normalizarTexto(texto?: string | null): string {
    if (!texto) return '';
    return texto
      .toLowerCase()
      .replace(/ø/g, 'o')
      .replace(/æ/g, 'ae')
      .replace(/œ/g, 'oe')
      .replace(/ß/g, 'ss')
      .replace(/ð/g, 'd')
      .replace(/ł/g, 'l')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public limpiarSufijosNombre(nombre: string): string {
    return nombre
      .replace(/\b(jr|junior|filho|neto|ii|iii|iv)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public coincidenClubes(clubA?: string | null, clubB?: string | null): boolean {
    const normA = this.normalizarTexto(clubA);
    const normB = this.normalizarTexto(clubB);

    if (!normA || !normB) return false;
    if (normA === normB) return true;
    if (normA.includes(normB) || normB.includes(normA)) return true;

    // Búsqueda en el diccionario de alias
    for (const aliases of Object.values(NormalizadorJugadorService.ALIAS_CLUBES)) {
      const matchA = aliases.some((al) => this.normalizarTexto(al) === normA || normA.includes(this.normalizarTexto(al)));
      const matchB = aliases.some((al) => this.normalizarTexto(al) === normB || normB.includes(this.normalizarTexto(al)));
      if (matchA && matchB) {
        return true;
      }
    }

    return false;
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

    const normWSSinSufijo = this.limpiarSufijosNombre(normWS);

    // 1. Coincidencia exacta de nombre
    for (const j of jugadoresLocales) {
      const normLocal = this.normalizarTexto(j.nombre);
      if (normLocal === normWS) {
        return j;
      }
    }

    // 2. Coincidencia ignorando sufijos ("Cristian Cásseres" vs "Cristian Cásseres Jr.")
    for (const j of jugadoresLocales) {
      const normLocalSinSufijo = this.limpiarSufijosNombre(this.normalizarTexto(j.nombre));
      if (normLocalSinSufijo === normWSSinSufijo) {
        if (!equipoWhoScored || !j.equipo?.nombre || this.coincidenClubes(equipoWhoScored, j.equipo.nombre)) {
          return j;
        }
      }
    }

    // 3. Coincidencia con club verificado (apellidos o hipocorísticos comunes)
    const partesWS = normWS.split(' ').filter((p) => p.length > 0);
    const apellidoWS = partesWS[partesWS.length - 1];

    if (apellidoWS && apellidoWS.length >= 3) {
      const candidatosClub = jugadoresLocales.filter((j) => {
        if (equipoWhoScored && j.equipo?.nombre) {
          const matchClub =
            this.coincidenClubes(equipoWhoScored, j.equipo.nombre) ||
            (j.equipo.nombreCorto && this.coincidenClubes(equipoWhoScored, j.equipo.nombreCorto));
          if (!matchClub) return false;
        }

        const normLocal = this.normalizarTexto(j.nombre);
        const partesLocal = normLocal.split(' ').filter((p) => p.length > 0);
        const apellidoLocal = partesLocal[partesLocal.length - 1];

        // Mismo apellido (o apellido contenido en apellido compuesto: ej "thuram" en "thuram ulien")
        if (
          apellidoLocal === apellidoWS ||
          normLocal.includes(apellidoWS) ||
          normWS.includes(apellidoLocal)
        ) {
          return true;
        }

        // Variación Álex / Alejandro
        const primerWS = partesWS[0];
        const primerLocal = partesLocal[0];
        if (
          (primerWS === 'alex' && primerLocal === 'alejandro') ||
          (primerWS === 'alejandro' && primerLocal === 'alex')
        ) {
          if (apellidoLocal === apellidoWS) return true;
        }

        return false;
      });

      if (candidatosClub.length === 1) {
        return candidatosClub[0];
      }
    }

    // 4. Coincidencia abreviada (ej. "M. Salah" con "Mohamed Salah")
    if (apellidoWS && apellidoWS.length >= 3) {
      for (const j of jugadoresLocales) {
        const normLocal = this.normalizarTexto(j.nombre);
        const partesLocal = normLocal.split(' ').filter((p) => p.length > 0);
        const apellidoLocal = partesLocal[partesLocal.length - 1];

        if (apellidoLocal === apellidoWS) {
          if (equipoWhoScored && j.equipo?.nombre) {
            if (this.coincidenClubes(equipoWhoScored, j.equipo.nombre)) {
              return j;
            }
          } else {
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
