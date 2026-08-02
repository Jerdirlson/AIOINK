import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { ShortcutToken } from '@prisma/client';
import { ShortcutTokensService } from './shortcut-tokens.service';

export const CABECERA_TOKEN_ATAJO = 'x-shortcut-token';

export type PeticionConAtajo = Request & { shortcutToken: ShortcutToken };

/**
 * Autentica al Atajo de iOS con su token de propósito único, en vez del JWT
 * de sesión. Va acompañado de @Public() para que el JwtAuthGuard global no
 * exija además un JWT.
 */
@Injectable()
export class ShortcutTokenGuard implements CanActivate {
  constructor(private readonly tokens: ShortcutTokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PeticionConAtajo>();
    const valor = request.headers[CABECERA_TOKEN_ATAJO];

    if (typeof valor !== 'string' || valor.length === 0) {
      throw new UnauthorizedException(
        `Falta la cabecera ${CABECERA_TOKEN_ATAJO}`,
      );
    }

    const token = await this.tokens.resolver(valor);

    if (!token) {
      throw new UnauthorizedException('Token de Atajo inválido o revocado');
    }

    request.shortcutToken = token;
    return true;
  }
}
