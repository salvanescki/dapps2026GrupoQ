import { describe, it, expect } from 'vitest';
import { abreviarNombreJugador } from '../../../src/utils/nombre-jugador';

describe('abreviarNombreJugador', () => {
  it('abrevia el nombre a su inicial y deja el apellido completo', () => {
    expect(abreviarNombreJugador('Kylian Mbappé')).toBe('K. Mbappé');
    expect(abreviarNombreJugador('Lamine Yamal')).toBe('L. Yamal');
  });

  it('conserva apellidos compuestos', () => {
    expect(abreviarNombreJugador('Alexis Mac Allister')).toBe('A. Mac Allister');
    expect(abreviarNombreJugador('Virgil van Dijk')).toBe('V. van Dijk');
  });

  it('no modifica nombres de una sola palabra', () => {
    expect(abreviarNombreJugador('Casemiro')).toBe('Casemiro');
  });

  it('respeta una inicial ya abreviada y limpia espacios', () => {
    expect(abreviarNombreJugador('  J. Alvarez ')).toBe('J. Alvarez');
    expect(abreviarNombreJugador('')).toBe('');
  });

  it('pasa a mayúscula la inicial', () => {
    expect(abreviarNombreJugador('nico paz')).toBe('N. paz');
  });
});
