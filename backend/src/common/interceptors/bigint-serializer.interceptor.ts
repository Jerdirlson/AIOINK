import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Los montos se guardan como BigInt (centavos) porque en COP superan el rango
 * de Int32. `JSON.stringify` no sabe serializar BigInt, así que se convierten
 * a number justo antes de responder.
 *
 * Es seguro: un BigInt de centavos solo pierde precisión por encima de
 * Number.MAX_SAFE_INTEGER (9.007e15 centavos ≈ 90 billones de pesos), muy por
 * fuera de cualquier monto real. Aun así se valida y se lanza en vez de
 * devolver un número corrupto en silencio.
 */
@Injectable()
export class BigIntSerializerInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map((data) => convertirBigInt(data)));
  }
}

function convertirBigInt(value: unknown): unknown {
  if (typeof value === 'bigint') {
    if (
      value > BigInt(Number.MAX_SAFE_INTEGER) ||
      value < BigInt(Number.MIN_SAFE_INTEGER)
    ) {
      throw new Error(
        `Monto fuera del rango serializable de forma exacta: ${value.toString()}`,
      );
    }
    return Number(value);
  }

  if (value instanceof Date || value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(convertirBigInt);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      convertirBigInt(v),
    ]),
  );
}
