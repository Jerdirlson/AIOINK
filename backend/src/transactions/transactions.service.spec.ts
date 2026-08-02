import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TransactionType } from '@prisma/client';
import { CategoriesService } from '../categories/categories.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionsService } from './transactions.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ACCOUNT_ID = '22222222-2222-4222-8222-222222222222';
const ACCOUNT_ID_2 = '33333333-3333-4333-8333-333333333333';
const CATEGORY_ID = '44444444-4444-4444-8444-444444444444';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: {
    transaction: {
      create: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      update: jest.Mock;
    };
    account: { findFirst: jest.Mock; findMany: jest.Mock };
    category: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let categories: { obtenerDelSistema: jest.Mock };

  beforeEach(async () => {
    prisma = {
      transaction: {
        create: jest.fn((args: unknown) => args),
        findFirst: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        update: jest.fn(),
      },
      account: {
        findFirst: jest.fn().mockResolvedValue({ id: ACCOUNT_ID }),
        findMany: jest.fn(),
      },
      category: {
        findFirst: jest.fn().mockResolvedValue({
          id: CATEGORY_ID,
          isSystem: false,
        }),
      },
      $transaction: jest.fn((ops: unknown[]) => Promise.resolve(ops)),
    };

    categories = {
      obtenerDelSistema: jest.fn().mockResolvedValue({ id: 'cat-transfer' }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CategoriesService, useValue: categories },
      ],
    }).compile();

    service = moduleRef.get(TransactionsService);
  });

  const dtoBase: CreateTransactionDto = {
    accountId: ACCOUNT_ID,
    categoryId: CATEGORY_ID,
    amount: -8000000,
    type: TransactionType.EXPENSE,
    description: 'Almuerzo',
    occurredAt: new Date('2026-08-01T12:00:00.000Z'),
  };

  describe('coherencia entre el signo del monto y el tipo', () => {
    it('acepta un gasto con monto negativo', async () => {
      await expect(service.create(USER_ID, dtoBase)).resolves.toBeDefined();
    });

    it('rechaza un gasto con monto positivo', async () => {
      await expect(
        service.create(USER_ID, { ...dtoBase, amount: 8000000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza un ingreso con monto negativo', async () => {
      await expect(
        service.create(USER_ID, {
          ...dtoBase,
          type: TransactionType.INCOME,
          amount: -100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza monto 0', async () => {
      await expect(
        service.create(USER_ID, { ...dtoBase, amount: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza crear una transferencia por el endpoint normal', async () => {
      await expect(
        service.create(USER_ID, {
          ...dtoBase,
          type: TransactionType.TRANSFER,
        }),
      ).rejects.toThrow(/POST \/transactions\/transfer/);
    });
  });

  describe('transferencias', () => {
    beforeEach(() => {
      prisma.account.findMany.mockResolvedValue([
        { id: ACCOUNT_ID },
        { id: ACCOUNT_ID_2 },
      ]);
    });

    it('crea dos patas con signos opuestos y el mismo transferGroupId', async () => {
      await service.createTransfer(USER_ID, {
        fromAccountId: ACCOUNT_ID,
        toAccountId: ACCOUNT_ID_2,
        amount: 50000000,
        occurredAt: new Date('2026-08-01T12:00:00.000Z'),
      });

      const llamadas = prisma.transaction.create.mock.calls as Array<
        [{ data: Record<string, unknown> }]
      >;
      const [origen, destino] = llamadas.map(([arg]) => arg.data);

      expect(origen.accountId).toBe(ACCOUNT_ID);
      expect(origen.amount).toBe(-50000000n);
      expect(destino.accountId).toBe(ACCOUNT_ID_2);
      expect(destino.amount).toBe(50000000n);
      expect(origen.transferGroupId).toBe(destino.transferGroupId);
      expect(origen.transferGroupId).toEqual(expect.any(String));
    });

    it('escribe ambas patas dentro de una misma transacción de base de datos', async () => {
      await service.createTransfer(USER_ID, {
        fromAccountId: ACCOUNT_ID,
        toAccountId: ACCOUNT_ID_2,
        amount: 1000,
        occurredAt: new Date(),
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('rechaza transferir a la misma cuenta', async () => {
      await expect(
        service.createTransfer(USER_ID, {
          fromAccountId: ACCOUNT_ID,
          toAccountId: ACCOUNT_ID,
          amount: 1000,
          occurredAt: new Date(),
        }),
      ).rejects.toThrow(/distintas/);
    });

    it('rechaza si alguna cuenta no es del usuario', async () => {
      prisma.account.findMany.mockResolvedValue([{ id: ACCOUNT_ID }]);

      await expect(
        service.createTransfer(USER_ID, {
          fromAccountId: ACCOUNT_ID,
          toAccountId: ACCOUNT_ID_2,
          amount: 1000,
          occurredAt: new Date(),
        }),
      ).rejects.toThrow(/no existe o no es tuya/);
    });

    it('al eliminar una pata elimina la transferencia completa', async () => {
      prisma.transaction.findFirst.mockResolvedValue({
        id: 'tx-1',
        transferGroupId: 'grupo-1',
      });

      await service.remove(USER_ID, 'tx-1');

      expect(prisma.transaction.deleteMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, transferGroupId: 'grupo-1' },
      });
      expect(prisma.transaction.delete).not.toHaveBeenCalled();
    });

    it('no deja editar una pata de transferencia por separado', async () => {
      prisma.transaction.findFirst.mockResolvedValue({
        id: 'tx-1',
        transferGroupId: 'grupo-1',
        amount: -1000n,
        type: TransactionType.TRANSFER,
      });

      await expect(
        service.update(USER_ID, 'tx-1', { amount: -2000 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('pertenencia de cuenta y categoría', () => {
    it('rechaza una cuenta que no es del usuario', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(service.create(USER_ID, dtoBase)).rejects.toThrow(
        /cuenta no existe o no es tuya/,
      );
    });

    it('rechaza asignar manualmente una categoría del sistema', async () => {
      prisma.category.findFirst.mockResolvedValue({
        id: CATEGORY_ID,
        isSystem: true,
      });

      await expect(service.create(USER_ID, dtoBase)).rejects.toThrow(
        /categoría del sistema/,
      );
    });
  });

  describe('filtros de listado', () => {
    it('rechaza un rango de fechas invertido', async () => {
      await expect(
        service.findAll(USER_ID, {
          from: new Date('2026-08-10'),
          to: new Date('2026-08-01'),
        }),
      ).rejects.toThrow(/no puede ser posterior/);
    });
  });
});
