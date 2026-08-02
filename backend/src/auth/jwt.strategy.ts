import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { UsuarioAutenticado } from '../common/decorators/current-user.decorator';
import type { Env } from '../config/env.validation';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService<Env, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
    });
  }

  /**
   * Passport ya verificó la firma y la expiración; aquí solo se le da forma
   * al objeto que quedará en `request.user`.
   */
  validate(payload: JwtPayload): UsuarioAutenticado {
    return { id: payload.sub, email: payload.email };
  }
}
