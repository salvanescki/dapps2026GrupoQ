import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET || 'super_secreto_para_desarrollo_tokens_2026_grupo_q',
    });
  }

  async validate(payload: { sub: string; email: string }) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Token inválido.');
    }
    return { id: payload.sub, email: payload.email };
  }
}
