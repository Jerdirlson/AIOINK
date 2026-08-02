import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

interface FilaAgrupada {
  categoryId: string;
  _sum: { amount: bigint | null };
}

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: {
    transaction: { groupBy: jest.Mock };
    category: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };

  const USER_ID = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    prisma = {
      transaction: { groupBy: jest.fn() },
      category: { findMany: jest.fn() },
      $queryRaw: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ReportsService);
  });

  describe('summary', () => {
    it('separa entradas de salidas y devuelve ambas en positivo', async () => {
      prisma.transaction.groupBy.mockResolvedValue([
        { type: 'INCOME', _sum: { amount: 500000000n } },
        { type: 'EXPENSE', _sum: { amount: -41117900n } },
      ]);

      const res = await service.summary(USER_ID, {});

      expect(res.income).toBe(500000000n);
      expect(res.expense).toBe(41117900n);
      expect(res.balance).toBe(500000000n - 41117900n);
    });

    it('excluye las categorías del sistema del cálculo', async () => {
      prisma.transaction.groupBy.mockResolvedValue([]);

      await service.summary(USER_ID, {});

      const llamadas = prisma.transaction.groupBy.mock.calls as Array<
        [{ where: unknown }]
      >;
      const where = llamadas[0][0].where as {
        category: { isSystem: boolean };
      };

      // Saldo inicial y transferencias no son ingreso ni gasto real.
      expect(where.category).toEqual({ isSystem: false });
    });

    it('rechaza un rango invertido', async () => {
      await expect(
        service.summary(USER_ID, {
          from: new Date('2026-08-10'),
          to: new Date('2026-08-01'),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('byCategory', () => {
    const agrupado = (filas: FilaAgrupada[]) => {
      prisma.transaction.groupBy.mockResolvedValue(filas);
      prisma.category.findMany.mockResolvedValue(
        filas.map((f, i) => ({
          id: f.categoryId,
          name: `Cat ${i + 1}`,
          icon: 'circle.fill',
          colorSlot: i + 1,
        })),
      );
    };

    it('devuelve los totales en positivo, ordenados de mayor a menor', async () => {
      agrupado([
        { categoryId: 'c1', _sum: { amount: -15500000n } },
        { categoryId: 'c2', _sum: { amount: -18000000n } },
      ]);

      const res = await service.byCategory(USER_ID, {});

      expect(res.items[0].total).toBe(18000000n);
      expect(res.items[1].total).toBe(15500000n);
      expect(res.total).toBe(33500000n);
    });

    it('calcula porcentajes que suman ~100', async () => {
      agrupado([
        { categoryId: 'c1', _sum: { amount: -18000000n } },
        { categoryId: 'c2', _sum: { amount: -15500000n } },
        { categoryId: 'c3', _sum: { amount: -5617900n } },
      ]);

      const res = await service.byCategory(USER_ID, {});
      const suma = res.items.reduce((acc, i) => acc + i.percentage, 0);

      expect(suma).toBeGreaterThan(99.5);
      expect(suma).toBeLessThanOrEqual(100);
    });

    it('solo considera montos negativos (gasto)', async () => {
      agrupado([{ categoryId: 'c1', _sum: { amount: -1000n } }]);

      await service.byCategory(USER_ID, {});

      const llamadas = prisma.transaction.groupBy.mock.calls as Array<
        [{ where: unknown }]
      >;
      const where = llamadas[0][0].where as {
        amount: { lt: number };
      };

      expect(where.amount).toEqual({ lt: 0 });
    });

    it('agrupa de la novena categoría en adelante como "Otros"', async () => {
      agrupado(
        Array.from({ length: 11 }, (_, i) => ({
          categoryId: `c${i}`,
          _sum: { amount: BigInt(-(11 - i) * 1000) },
        })),
      );

      const res = await service.byCategory(USER_ID, {});

      // 7 con color + 1 "Otros" = 8, el tamaño de la paleta.
      expect(res.items).toHaveLength(8);
      expect(res.items[7].name).toBe('Otros');
      expect(res.items[7].colorSlot).toBeNull();
      // Nada se pierde al agrupar.
      const suma = res.items.reduce((acc, i) => acc + i.total, 0n);
      expect(suma).toBe(res.total);
    });

    it('devuelve vacío sin consultar categorías si no hay gasto', async () => {
      prisma.transaction.groupBy.mockResolvedValue([]);

      const res = await service.byCategory(USER_ID, {});

      expect(res.items).toEqual([]);
      expect(res.total).toBe(0n);
      expect(prisma.category.findMany).not.toHaveBeenCalled();
    });
  });

  describe('monthly', () => {
    it('formatea el mes como YYYY-MM y calcula el saldo', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          month: new Date('2026-07-01T00:00:00.000Z'),
          income: 500000000n,
          expense: 41117900n,
        },
      ]);

      const res = await service.monthly(USER_ID, {});

      expect(res[0].month).toBe('2026-07');
      expect(res[0].balance).toBe(500000000n - 41117900n);
    });
  });
});
