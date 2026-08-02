import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Account,
  TransactionSource,
  TransactionType,
} from '@prisma/client';
import { CategoriesService } from '../categories/categories.service';
import { CATEGORIA_SALDO_INICIAL } from '../categories/categorias-por-defecto';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAccountDto } from './dto/create-account.dto';
import type { UpdateAccountDto } from './dto/update-account.dto';

export interface CuentaConSaldo extends Account {
  /** Saldo actual en centavos = suma de las transacciones de la cuenta. */
  balance: bigint;
}

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
  ) {}

  async findAll(
    userId: string,
    incluirArchivadas = false,
  ): Promise<CuentaConSaldo[]> {
    const cuentas = await this.prisma.account.findMany({
      where: { userId, ...(incluirArchivadas ? {} : { isArchived: false }) },
      orderBy: { createdAt: 'asc' },
    });

    if (cuentas.length === 0) {
      return [];
    }

    // Una sola agregación para todas las cuentas, en vez de una consulta por
    // cuenta (evita N+1).
    const sumas = await this.prisma.transaction.groupBy({
      by: ['accountId'],
      where: { accountId: { in: cuentas.map((c) => c.id) } },
      _sum: { amount: true },
    });

    const porCuenta = new Map(
      sumas.map((s) => [s.accountId, s._sum.amount ?? 0n]),
    );

    return cuentas.map((cuenta) => ({
      ...cuenta,
      balance: porCuenta.get(cuenta.id) ?? 0n,
    }));
  }

  async findOne(userId: string, id: string): Promise<CuentaConSaldo> {
    const cuenta = await this.prisma.account.findFirst({
      where: { id, userId },
    });

    if (!cuenta) {
      throw new NotFoundException('La cuenta no existe');
    }

    return { ...cuenta, balance: await this.calcularSaldo(id) };
  }

  async create(userId: string, dto: CreateAccountDto): Promise<CuentaConSaldo> {
    const saldoInicial = BigInt(dto.initialBalance ?? 0);

    const categoriaSaldoInicial = await this.categories.obtenerDelSistema(
      userId,
      CATEGORIA_SALDO_INICIAL,
    );

    // La cuenta y su transacción de apertura se crean en una transacción de
    // base de datos: una cuenta con saldo inicial a medias sería inconsistente.
    const cuenta = await this.prisma.$transaction(async (tx) => {
      const creada = await tx.account.create({
        data: { userId, name: dto.name.trim(), type: dto.type },
      });

      if (saldoInicial !== 0n) {
        await tx.transaction.create({
          data: {
            userId,
            accountId: creada.id,
            categoryId: categoriaSaldoInicial.id,
            amount: saldoInicial,
            type:
              saldoInicial > 0n
                ? TransactionType.INCOME
                : TransactionType.EXPENSE,
            description: CATEGORIA_SALDO_INICIAL,
            occurredAt: new Date(),
            source: TransactionSource.MANUAL,
          },
        });
      }

      return creada;
    });

    return { ...cuenta, balance: saldoInicial };
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAccountDto,
  ): Promise<CuentaConSaldo> {
    await this.findOne(userId, id);

    const cuenta = await this.prisma.account.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.isArchived !== undefined ? { isArchived: dto.isArchived } : {}),
      },
    });

    return { ...cuenta, balance: await this.calcularSaldo(id) };
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);

    const transacciones = await this.prisma.transaction.count({
      where: { accountId: id },
    });

    // Borrar la cuenta arrastraría sus transacciones (onDelete: Cascade) y con
    // ellas el historial. Si tiene movimientos, se archiva en vez de borrarse.
    if (transacciones > 0) {
      throw new ConflictException(
        `La cuenta tiene ${transacciones} transacción(es). Archivala en vez de eliminarla (PATCH con isArchived: true).`,
      );
    }

    await this.prisma.account.delete({ where: { id } });
  }

  private async calcularSaldo(accountId: string): Promise<bigint> {
    const { _sum } = await this.prisma.transaction.aggregate({
      where: { accountId },
      _sum: { amount: true },
    });

    return _sum.amount ?? 0n;
  }
}
