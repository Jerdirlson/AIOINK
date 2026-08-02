import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Prisma,
  type Transaction,
  TransactionSource,
  TransactionType,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { CategoriesService } from '../categories/categories.service';
import { CATEGORIA_TRANSFERENCIA } from '../categories/categorias-por-defecto';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTransactionDto } from './dto/create-transaction.dto';
import type { CreateTransferDto } from './dto/create-transfer.dto';
import type { QueryTransactionsDto } from './dto/query-transactions.dto';
import type { UpdateTransactionDto } from './dto/update-transaction.dto';

const LIMITE_POR_DEFECTO = 50;

export interface ListaTransacciones {
  items: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
  ) {}

  async findAll(
    userId: string,
    query: QueryTransactionsDto,
  ): Promise<ListaTransacciones> {
    const limit = query.limit ?? LIMITE_POR_DEFECTO;
    const offset = query.offset ?? 0;

    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('"from" no puede ser posterior a "to"');
    }

    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(query.accountId ? { accountId: query.accountId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.from || query.to
        ? {
            occurredAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
        include: {
          category: {
            select: { id: true, name: true, icon: true, colorSlot: true },
          },
          account: { select: { id: true, name: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async findOne(userId: string, id: string): Promise<Transaction> {
    const transaccion = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true, account: true },
    });

    if (!transaccion) {
      throw new NotFoundException('La transacción no existe');
    }

    return transaccion;
  }

  async create(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    this.validarSignoContraTipo(dto.amount, dto.type);
    await this.verificarPertenencia(userId, dto.accountId, dto.categoryId);

    return this.prisma.transaction.create({
      data: {
        userId,
        accountId: dto.accountId,
        categoryId: dto.categoryId,
        amount: BigInt(dto.amount),
        type: dto.type,
        description: dto.description.trim(),
        note: dto.note?.trim() ?? null,
        occurredAt: dto.occurredAt,
        source: dto.source ?? TransactionSource.MANUAL,
        externalId: dto.externalId ?? null,
      },
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    const existente = await this.findOne(userId, id);
    this.rechazarSiEsTransferencia(existente);

    // El signo y el tipo se validan como conjunto: si solo llega uno de los
    // dos, se compara contra el valor que ya tenía la transacción.
    const amount = dto.amount ?? Number(existente.amount);
    const type = dto.type ?? existente.type;
    this.validarSignoContraTipo(amount, type);

    await this.verificarPertenencia(userId, dto.accountId, dto.categoryId);

    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.accountId !== undefined ? { accountId: dto.accountId } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.amount !== undefined ? { amount: BigInt(dto.amount) } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.note !== undefined ? { note: dto.note?.trim() ?? null } : {}),
        ...(dto.occurredAt !== undefined ? { occurredAt: dto.occurredAt } : {}),
      },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const transaccion = await this.findOne(userId, id);

    // Una transferencia se borra completa: dejar una sola pata descuadraría
    // los saldos de las dos cuentas.
    if (transaccion.transferGroupId) {
      await this.prisma.transaction.deleteMany({
        where: { userId, transferGroupId: transaccion.transferGroupId },
      });
      return;
    }

    await this.prisma.transaction.delete({ where: { id } });
  }

  /**
   * Crea una transferencia como dos transacciones enlazadas por
   * `transferGroupId`: −X en la cuenta origen y +X en la destino.
   */
  async createTransfer(
    userId: string,
    dto: CreateTransferDto,
  ): Promise<Transaction[]> {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException(
        'La cuenta de origen y la de destino deben ser distintas',
      );
    }

    const cuentas = await this.prisma.account.findMany({
      where: { userId, id: { in: [dto.fromAccountId, dto.toAccountId] } },
    });

    if (cuentas.length !== 2) {
      throw new NotFoundException(
        'Alguna de las cuentas no existe o no es tuya',
      );
    }

    const categoria = await this.categories.obtenerDelSistema(
      userId,
      CATEGORIA_TRANSFERENCIA,
    );

    const transferGroupId = randomUUID();
    const monto = BigInt(dto.amount);
    const descripcion = dto.description?.trim() || CATEGORIA_TRANSFERENCIA;

    const base = {
      userId,
      categoryId: categoria.id,
      type: TransactionType.TRANSFER,
      description: descripcion,
      occurredAt: dto.occurredAt,
      source: TransactionSource.MANUAL,
      transferGroupId,
    };

    // Las dos patas se escriben en la misma transacción de base de datos: si
    // una falla, no queda dinero "desaparecido" en la otra cuenta.
    return this.prisma.$transaction([
      this.prisma.transaction.create({
        data: { ...base, accountId: dto.fromAccountId, amount: -monto },
      }),
      this.prisma.transaction.create({
        data: { ...base, accountId: dto.toAccountId, amount: monto },
      }),
    ]);
  }

  private validarSignoContraTipo(amount: number, type: TransactionType): void {
    if (amount === 0) {
      throw new BadRequestException('El monto no puede ser 0');
    }

    if (type === TransactionType.EXPENSE && amount > 0) {
      throw new BadRequestException(
        'Un gasto (EXPENSE) debe tener monto negativo',
      );
    }

    if (type === TransactionType.INCOME && amount < 0) {
      throw new BadRequestException(
        'Un ingreso (INCOME) debe tener monto positivo',
      );
    }

    if (type === TransactionType.TRANSFER) {
      throw new BadRequestException(
        'Las transferencias se crean con POST /transactions/transfer',
      );
    }
  }

  private rechazarSiEsTransferencia(transaccion: Transaction): void {
    if (transaccion.transferGroupId) {
      throw new ForbiddenException(
        'Una pata de transferencia no se edita por separado: eliminá la transferencia y creala de nuevo',
      );
    }
  }

  /** Verifica que la cuenta y la categoría referenciadas sean del usuario. */
  private async verificarPertenencia(
    userId: string,
    accountId?: string,
    categoryId?: string,
  ): Promise<void> {
    if (accountId) {
      const cuenta = await this.prisma.account.findFirst({
        where: { id: accountId, userId },
        select: { id: true },
      });
      if (!cuenta) {
        throw new NotFoundException('La cuenta no existe o no es tuya');
      }
    }

    if (categoryId) {
      const categoria = await this.prisma.category.findFirst({
        where: { id: categoryId, userId },
        select: { id: true, isSystem: true },
      });
      if (!categoria) {
        throw new NotFoundException('La categoría no existe o no es tuya');
      }
      if (categoria.isSystem) {
        throw new BadRequestException(
          'No se puede asignar una categoría del sistema manualmente',
        );
      }
    }
  }
}
