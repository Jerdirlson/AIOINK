import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';

/**
 * Guard global: todo endpoint exige JWT salvo que esté marcado con @Public().
 * Se elige "seguro por defecto" para que olvidar el guard en un controlador
 * nuevo no abra un hueco.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const esPublico = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (esPublico) {
      return true;
    }

    return super.canActivate(context);
  }
}
