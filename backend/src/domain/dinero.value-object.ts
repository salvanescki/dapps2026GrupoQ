import { ReglaDeNegocioException } from './exceptions/regla-de-negocio.exception';

export class Dinero {
  private readonly _centavos: number;

  private constructor(centavos: number) {
    if (!Number.isInteger(centavos) || centavos < 0) {
      throw new ReglaDeNegocioException(
        'El valor en centavos debe ser un entero no negativo.',
      );
    }
    this._centavos = centavos;
  }

  public static desdeCentavos(centavos: number): Dinero {
    return new Dinero(centavos);
  }

  public static desdeMonto(monto: number | string): Dinero {
    const num = typeof monto === 'string' ? Number(monto) : monto;

    if (num === null || num === undefined || isNaN(num) || !isFinite(num)) {
      throw new ReglaDeNegocioException('El monto monetario no es válido.');
    }

    if (num < 0) {
      throw new ReglaDeNegocioException('El monto monetario no puede ser negativo.');
    }

    // Redondeo half-up a 2 decimales usando centavos
    const centavos = Math.round((num + Number.EPSILON) * 100);
    return new Dinero(centavos);
  }

  public get centavos(): number {
    return this._centavos;
  }

  public sumar(otro: Dinero): Dinero {
    return new Dinero(this._centavos + otro.centavos);
  }

  public restar(otro: Dinero): Dinero {
    if (this._centavos < otro.centavos) {
      throw new ReglaDeNegocioException(
        'El saldo monetario no puede ser negativo.',
      );
    }
    return new Dinero(this._centavos - otro.centavos);
  }

  public multiplicarPorEntero(cantidad: number): Dinero {
    if (!Number.isInteger(cantidad) || cantidad < 0) {
      throw new ReglaDeNegocioException(
        'La cantidad para multiplicar debe ser un número entero no negativo.',
      );
    }
    return new Dinero(this._centavos * cantidad);
  }

  public esMayorOIgualQue(otro: Dinero): boolean {
    return this._centavos >= otro.centavos;
  }

  public esMayorQue(otro: Dinero): boolean {
    return this._centavos > otro.centavos;
  }

  public esMenorQue(otro: Dinero): boolean {
    return this._centavos < otro.centavos;
  }

  public esMenorOIgualQue(otro: Dinero): boolean {
    return this._centavos <= otro.centavos;
  }

  public esIgualA(otro: Dinero): boolean {
    return this._centavos === otro.centavos;
  }

  public aNumero(): number {
    return this._centavos / 100;
  }

  public aDecimalFijo(): string {
    return (this._centavos / 100).toFixed(2);
  }
}
