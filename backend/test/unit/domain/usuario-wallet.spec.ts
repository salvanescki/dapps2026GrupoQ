import { Dinero } from '../../../src/domain/dinero.value-object';
import { Usuario } from '../../../src/domain/usuario.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('Dinero Value Object & Usuario Wallet Domain Unit Tests', () => {
  describe('Dinero Value Object', () => {
    it('debe crear Dinero correctamente desde monto numérico y string con redondeo half-up a 2 decimales', () => {
      const d1 = Dinero.desdeMonto(10.55);
      expect(d1.centavos).toBe(1055);
      expect(d1.aNumero()).toBe(10.55);
      expect(d1.aDecimalFijo()).toBe('10.55');

      const d2 = Dinero.desdeMonto('25.99');
      expect(d2.centavos).toBe(2599);
      expect(d2.aNumero()).toBe(25.99);

      // Redondeo half-up
      const d3 = Dinero.desdeMonto(1.005);
      expect(d3.centavos).toBe(101);
      expect(d3.aDecimalFijo()).toBe('1.01');

      const d4 = Dinero.desdeMonto(1.004);
      expect(d4.centavos).toBe(100);
      expect(d4.aDecimalFijo()).toBe('1.00');
    });

    it('debe crear Dinero desde centavos enteros', () => {
      const d = Dinero.desdeCentavos(500);
      expect(d.centavos).toBe(500);
      expect(d.aNumero()).toBe(5.0);
      expect(d.aDecimalFijo()).toBe('5.00');
    });

    it('debe rechazar montos negativos, NaN, Infinity o centavos no enteros', () => {
      expect(() => Dinero.desdeMonto(-1)).toThrow(ReglaDeNegocioException);
      expect(() => Dinero.desdeMonto(NaN)).toThrow(ReglaDeNegocioException);
      expect(() => Dinero.desdeMonto(Infinity)).toThrow(ReglaDeNegocioException);
      expect(() => Dinero.desdeCentavos(10.5)).toThrow(ReglaDeNegocioException);
      expect(() => Dinero.desdeCentavos(-100)).toThrow(ReglaDeNegocioException);
    });

    it('debe sumar importes con precisión exacta', () => {
      const a = Dinero.desdeMonto(0.1);
      const b = Dinero.desdeMonto(0.2);
      const suma = a.sumar(b);
      expect(suma.centavos).toBe(30);
      expect(suma.aNumero()).toBe(0.3);
    });

    it('debe restar importes y arrojar excepción si el resultado sería negativo', () => {
      const mayor = Dinero.desdeMonto(50);
      const menor = Dinero.desdeMonto(20);
      const resta = mayor.restar(menor);
      expect(resta.aNumero()).toBe(30);

      expect(() => menor.restar(mayor)).toThrow(ReglaDeNegocioException);
    });

    it('debe multiplicar por enteros no negativos', () => {
      const precio = Dinero.desdeMonto(1.5);
      const total = precio.multiplicarPorEntero(5);
      expect(total.aNumero()).toBe(7.5);

      const cero = precio.multiplicarPorEntero(0);
      expect(cero.aNumero()).toBe(0);

      expect(() => precio.multiplicarPorEntero(-2)).toThrow(
        ReglaDeNegocioException,
      );
      expect(() => precio.multiplicarPorEntero(1.5)).toThrow(
        ReglaDeNegocioException,
      );
    });

    it('debe comparar importes correctamente', () => {
      const d100 = Dinero.desdeMonto(100);
      const d50 = Dinero.desdeMonto(50);
      const d100Bis = Dinero.desdeMonto(100);

      expect(d100.esMayorQue(d50)).toBe(true);
      expect(d50.esMayorQue(d100)).toBe(false);

      expect(d100.esMayorOIgualQue(d100Bis)).toBe(true);
      expect(d100.esMayorOIgualQue(d50)).toBe(true);
      expect(d50.esMayorOIgualQue(d100)).toBe(false);

      expect(d50.esMenorQue(d100)).toBe(true);
      expect(d100.esMenorQue(d50)).toBe(false);

      expect(d50.esMenorOIgualQue(d50)).toBe(true);
      expect(d100.esMenorOIgualQue(d50)).toBe(false);

      expect(d100.esIgualA(d100Bis)).toBe(true);
      expect(d100.esIgualA(d50)).toBe(false);
    });
  });

  describe('Usuario Wallet & RBAC Domain Unit Tests', () => {
    const baseProps = {
      nombre: 'Enzo Fernandez',
      correo: 'enzo@chelsea.com',
      contrasenaHash: '$2b$10$hashedpasswordexample1234567890',
    };

    it('debe inicializar usuario con rol USUARIO y saldo 1000.00 por defecto', () => {
      const usuario = Usuario.crear(baseProps);
      expect(usuario.rol).toBe('USUARIO');
      expect(usuario.esAdmin()).toBe(false);
      expect(usuario.saldo.aNumero()).toBe(1000.0);
    });

    it('debe permitir inicializar con rol ADMIN y saldo personalizado', () => {
      const admin = Usuario.crear({
        ...baseProps,
        rol: 'ADMIN',
        saldo: 5000.5,
      });
      expect(admin.rol).toBe('ADMIN');
      expect(admin.esAdmin()).toBe(true);
      expect(admin.saldo.aNumero()).toBe(5000.5);
    });

    it('debe debitar saldo exitosamente y actualizar timestamp', () => {
      const usuario = Usuario.crear(baseProps);
      const fechaAnterior = usuario.actualizadoEn;

      usuario.debitarSaldo(250);
      expect(usuario.saldo.aNumero()).toBe(750.0);
      expect(usuario.actualizadoEn.getTime()).toBeGreaterThanOrEqual(
        fechaAnterior.getTime(),
      );

      usuario.debitarSaldo(Dinero.desdeMonto(50));
      expect(usuario.saldo.aNumero()).toBe(700.0);
    });

    it('debe rechazar débito si saldo es insuficiente', () => {
      const usuario = Usuario.crear({ ...baseProps, saldo: 100 });
      expect(() => usuario.debitarSaldo(100.01)).toThrow(
        ReglaDeNegocioException,
      );
      expect(() => usuario.debitarSaldo(100.01)).toThrow(
        'Saldo monetario insuficiente para realizar la operación.',
      );
    });

    it('debe rechazar débito o crédito con monto menor o igual a cero', () => {
      const usuario = Usuario.crear(baseProps);
      expect(() => usuario.debitarSaldo(0)).toThrow(ReglaDeNegocioException);
      expect(() => usuario.acreditarSaldo(0)).toThrow(ReglaDeNegocioException);
    });

    it('debe rechazar débito o crédito si la cuenta está inactiva', () => {
      const usuario = Usuario.crear(baseProps);
      usuario.desactivar();
      expect(() => usuario.debitarSaldo(100)).toThrow(ReglaDeNegocioException);
      expect(() => usuario.acreditarSaldo(100)).toThrow(
        ReglaDeNegocioException,
      );
    });

    it('debe acreditar saldo correctamente', () => {
      const usuario = Usuario.crear(baseProps);
      usuario.acreditarSaldo(500.25);
      expect(usuario.saldo.aNumero()).toBe(1500.25);
    });

    it('debe promover usuario a ADMIN correctamente', () => {
      const usuario = Usuario.crear(baseProps);
      expect(usuario.esAdmin()).toBe(false);

      usuario.promoverAAdmin();
      expect(usuario.rol).toBe('ADMIN');
      expect(usuario.esAdmin()).toBe(true);
    });
  });
});
