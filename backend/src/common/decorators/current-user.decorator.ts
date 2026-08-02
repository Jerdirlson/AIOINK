import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface UsuarioAutenticado {
  id: string;
  email: string;
}

/**
 * Inyecta el usuario que viene del JWT ya validado.
 * Uso: `@CurrentUser() usuario: UsuarioAutenticado`
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: UsuarioAutenticado }>();
    return request.user;
  },
);
