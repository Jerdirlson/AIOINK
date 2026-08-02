import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca una ruta como accesible sin JWT. Por defecto todo está protegido
 * (el JwtAuthGuard es global), así que abrir una ruta es un acto explícito.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
