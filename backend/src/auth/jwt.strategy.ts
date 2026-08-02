import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { UsuarioAutenticado } from '../common/decorators/current-user.decorator';
import type { Env } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
    });
  }

  /**
   * Passport ya verificó la firma y la expiración. Además se comprueba que el
   * usuario siga existiendo: un JWT es válido criptográficamente aunque la
   * cuenta se haya eliminado, y con tokens de 7 días eso dejaría operar una
   * semana después de un borrado — incompatible con el derecho de cancelación
   * (ver docs/07). Es una búsqueda por clave primaria, indexada.
   */
  async validate(payload: JwtPayload): Promise<UsuarioAutenticado> {
    const usuario = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });

    if (!usuario) {
      throw new UnauthorizedException('La cuenta ya no existe');
    }

    return { id: usuario.id, email: usuario.email };
  }
}
