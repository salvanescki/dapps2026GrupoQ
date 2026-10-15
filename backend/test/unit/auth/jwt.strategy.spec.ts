import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../../../src/auth/jwt.strategy';

describe('JwtStrategy Unit Tests', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy();
  });

  it('debe validar un payload valido y retornar { id, email }', () => {
    const payload = { sub: 'user-uuid-123', email: 'user@ejemplo.com' };
    const resultado = strategy.validate(payload);

    expect(resultado).toEqual({
      id: 'user-uuid-123',
      email: 'user@ejemplo.com',
    });
  });

  it('debe lanzar UnauthorizedException cuando el payload no contiene sub', () => {
    expect(() => strategy.validate({ sub: '', email: 'user@ejemplo.com' })).toThrow(
      UnauthorizedException
    );
    expect(() => strategy.validate(null as unknown as any)).toThrow(
      UnauthorizedException
    );
  });
});
