import { lastValueFrom, of } from 'rxjs';
import { BigIntSerializerInterceptor } from './bigint-serializer.interceptor';

describe('BigIntSerializerInterceptor', () => {
  const interceptor = new BigIntSerializerInterceptor();

  const ejecutar = (data: unknown): Promise<unknown> =>
    lastValueFrom(
      interceptor.intercept({} as never, { handle: () => of(data) }),
    );

  it('convierte un BigInt suelto a number', async () => {
    await expect(ejecutar(-8000000n)).resolves.toBe(-8000000);
  });

  it('convierte BigInt anidados en objetos y arreglos', async () => {
    const entrada = {
      items: [{ amount: 1500n, nested: { balance: -250n } }],
      total: 2n,
    };

    await expect(ejecutar(entrada)).resolves.toEqual({
      items: [{ amount: 1500, nested: { balance: -250 } }],
      total: 2,
    });
  });

  it('deja las fechas intactas en vez de recorrerlas como objeto', async () => {
    const fecha = new Date('2026-08-01T12:00:00.000Z');
    const resultado = (await ejecutar({ occurredAt: fecha })) as {
      occurredAt: Date;
    };

    expect(resultado.occurredAt).toBeInstanceOf(Date);
    expect(resultado.occurredAt.toISOString()).toBe('2026-08-01T12:00:00.000Z');
  });

  it('preserva null y undefined', async () => {
    await expect(ejecutar({ a: null, b: undefined })).resolves.toEqual({
      a: null,
      b: undefined,
    });
  });

  it('lanza en vez de devolver un número corrupto si el monto excede el rango exacto', async () => {
    const fueraDeRango = BigInt(Number.MAX_SAFE_INTEGER) + 1n;

    await expect(ejecutar({ amount: fueraDeRango })).rejects.toThrow(
      /fuera del rango serializable/,
    );
  });
});
