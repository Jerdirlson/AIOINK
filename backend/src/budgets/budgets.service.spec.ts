import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CategoryKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetsService } from './budgets.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const CATEGORY_ID = '22222222-2222-4222-8222-222222222222';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let prisma: {
    budget: { findMany: jest.Mock; create: jest.Mock; findFirst: jest.Mock };
    transaction: { groupBy: jest.Mock; aggregate: jest.Mock };
    category: { findFirst: jest.Mock };
  };

  const presupuesto = (limite: bigint) => ({
    id: 'b1',
    categoryId: CATEGORY_ID,
    amount: limite,
    category: {
      id: CATEGORY_ID,
      name: 'Comida',
      icon: 'fork.knife',
      colorSlot: 1,
    },
  });

  beforeEach(async () => {
    prisma = {
      budget: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
      },
      transaction: { groupBy: jest.fn(), aggregate: jest.fn() },
      category: { findFirst: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [BudgetsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(BudgetsService);
  });

  /** Prepara un presupuesto con un gasto dado y devuelve el resultado. */
  const conGasto = async (limite: bigint, gastado: bigint) => {
    prisma.budget.findMany.mockResolvedValue([presupuesto(limite)]);
    prisma.transaction.groupBy.mockResolvedValue([
      { categoryId: CATEGORY_ID, _sum: { amount: -gastado } },
    ]);

    const [resultado] = await service.findAll(USER_ID);
    return resultado;
  };

  describe('estado y umbrales', () => {
    it('está OK por debajo del 80 %', async () => {
      const r = await conGasto(10_000_000n, 7_900_000n);
      expect(r.status).toBe('OK');
    });

    it('pasa a advertencia exactamente en el 80 %', async () => {
      const r = await conGasto(10_000_000n, 8_000_000n);
      expect(r.status).toBe('WARNING');
      expect(r.percentage).toBe(80);
    });

    it('sigue en advertencia justo en el límite', async () => {
      const r = await conGasto(10_000_000n, 10_000_000n);
      expect(r.status).toBe('WARNING');
      expect(r.remaining).toBe(0n);
    });

    it('se marca excedido al pasarse aunque sea por un centavo', async () => {
      const r = await conGasto(10_000_000n, 10_000_001n);

      expect(r.status).toBe('EXCEEDED');
      expect(r.remaining).toBe(-1n);
      // El porcentaje redondea a 100,0 con un decimal: quien distingue
      // "justo en el límite" de "pasado" es `status`, no el porcentaje.
      expect(r.percentage).toBe(100);
    });

    it('el porcentaje pasa de 100 cuando el exceso es apreciable', async () => {
      const r = await conGasto(10_000_000n, 12_500_000n);

      expect(r.status).toBe('EXCEEDED');
      expect(r.percentage).toBe(125);
      expect(r.remaining).toBe(-2_500_000n);
    });
  });

  describe('cálculo del gasto', () => {
    it('devuelve el gasto en positivo aunque se guarde negativo', async () => {
      const r = await conGasto(10_000_000n, 3_000_000n);
      expect(r.spent).toBe(3_000_000n);
      expect(r.remaining).toBe(7_000_000n);
    });

    it('un presupuesto sin gasto queda en 0 y no en nulo', async () => {
      prisma.budget.findMany.mockResolvedValue([presupuesto(10_000_000n)]);
      prisma.transaction.groupBy.mockResolvedValue([]);

      const [r] = await service.findAll(USER_ID);

      expect(r.spent).toBe(0n);
      expect(r.percentage).toBe(0);
      expect(r.status).toBe('OK');
    });

    it('solo suma montos negativos: un reembolso no cuenta como gasto', async () => {
      prisma.budget.findMany.mockResolvedValue([presupuesto(10_000_000n)]);
      prisma.transaction.groupBy.mockResolvedValue([]);

      await service.findAll(USER_ID);

      const llamadas = prisma.transaction.groupBy.mock.calls as Array<
        [{ where: { amount: unknown } }]
      >;
      expect(llamadas[0][0].where.amount).toEqual({ lt: 0 });
    });

    it('no consulta gastos si no hay presupuestos', async () => {
      prisma.budget.findMany.mockResolvedValue([]);

      const r = await service.findAll(USER_ID);

      expect(r).toEqual([]);
      expect(prisma.transaction.groupBy).not.toHaveBeenCalled();
    });
  });

  describe('creación', () => {
    it('rechaza presupuestar una categoría de ingreso', async () => {
      prisma.category.findFirst.mockResolvedValue({
        id: CATEGORY_ID,
        kind: CategoryKind.INCOME,
        isSystem: false,
      });

      await expect(
        service.create(USER_ID, { categoryId: CATEGORY_ID, amount: 1000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza presupuestar una categoría del sistema', async () => {
      prisma.category.findFirst.mockResolvedValue({
        id: CATEGORY_ID,
        kind: CategoryKind.SYSTEM,
        isSystem: true,
      });

      await expect(
        service.create(USER_ID, { categoryId: CATEGORY_ID, amount: 1000 }),
      ).rejects.toThrow(/categoría de gasto/);
    });

    it('rechaza una categoría que no es del usuario', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.create(USER_ID, { categoryId: CATEGORY_ID, amount: 1000 }),
      ).rejects.toThrow(/no existe o no es tuya/);
    });
  });
});
