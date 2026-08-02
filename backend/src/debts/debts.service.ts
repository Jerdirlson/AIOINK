import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DebtDirection, type Debt } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AbonarDto, CreateDebtDto, UpdateDebtDto } from './dto/debt.dto';

export interface DeudaConProgreso extends Debt {
  /** Cuánto se ha abonado, en centavos. */
  paid: bigint;
  /** 0..100 con un decimal. */
  percentagePaid: number;
  settled: boolean;
}

export interface ResumenDeudas {
  /** Total pendiente que debo, en centavos. */
  owedByMe: bigint;
  /** Total pendiente que me deben, en centavos. */
  owedToMe: bigint;
  /** owedToMe − owedByMe. Negativo = debo más de lo que me deben. */
  net: bigint;
}

@Injectable()
export class DebtsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<DeudaConProgreso[]> {
    const deudas = await this.prisma.debt.findMany({
      where: { userId },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });

    return deudas.map((deuda) => this.conProgreso(deuda));
  }

  /** Totales por dirección, para la tarjeta de resumen del dashboard. */
  async resumen(userId: string): Promise<ResumenDeudas> {
    const agrupado = await this.prisma.debt.groupBy({
      by: ['direction'],
      where: { userId },
      _sum: { remainingAmount: true },
    });

    let owedByMe = 0n;
    let owedToMe = 0n;

    for (const fila of agrupado) {
      const suma = fila._sum.remainingAmount ?? 0n;
      if (fila.direction === DebtDirection.OWED_BY_ME) {
        owedByMe = suma;
      } else {
        owedToMe = suma;
      }
    }

    return { owedByMe, owedToMe, net: owedToMe - owedByMe };
  }

  async findOne(userId: string, id: string): Promise<DeudaConProgreso> {
    const deuda = await this.prisma.debt.findFirst({ where: { id, userId } });

    if (!deuda) {
      throw new NotFoundException('La deuda no existe');
    }

    return this.conProgreso(deuda);
  }

  async create(userId: string, dto: CreateDebtDto): Promise<DeudaConProgreso> {
    const pendiente = BigInt(dto.remainingAmount ?? dto.totalAmount);

    if (pendiente > BigInt(dto.totalAmount)) {
      throw new BadRequestException(
        'El pendiente no puede ser mayor que el monto total',
      );
    }

    const deuda = await this.prisma.debt.create({
      data: {
        userId,
        name: dto.name.trim(),
        counterparty: dto.counterparty?.trim() ?? null,
        direction: dto.direction,
        totalAmount: BigInt(dto.totalAmount),
        remainingAmount: pendiente,
        dueDate: dto.dueDate ?? null,
      },
    });

    return this.conProgreso(deuda);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateDebtDto,
  ): Promise<DeudaConProgreso> {
    const existente = await this.findOne(userId, id);

    const total =
      dto.totalAmount !== undefined
        ? BigInt(dto.totalAmount)
        : existente.totalAmount;

    const pendiente =
      dto.remainingAmount !== undefined
        ? BigInt(dto.remainingAmount)
        : existente.remainingAmount;

    if (pendiente > total) {
      throw new BadRequestException(
        'El pendiente no puede ser mayor que el monto total',
      );
    }

    const deuda = await this.prisma.debt.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.counterparty !== undefined
          ? { counterparty: dto.counterparty?.trim() ?? null }
          : {}),
        ...(dto.direction !== undefined ? { direction: dto.direction } : {}),
        ...(dto.totalAmount !== undefined ? { totalAmount: total } : {}),
        ...(dto.remainingAmount !== undefined
          ? { remainingAmount: pendiente }
          : {}),
        ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate } : {}),
      },
    });

    return this.conProgreso(deuda);
  }

  /** Registra un abono. El pendiente nunca baja de 0. */
  async abonar(
    userId: string,
    id: string,
    dto: AbonarDto,
  ): Promise<DeudaConProgreso> {
    const deuda = await this.findOne(userId, id);

    if (deuda.remainingAmount === 0n) {
      throw new BadRequestException('Esta deuda ya está saldada');
    }

    if (BigInt(dto.amount) > deuda.remainingAmount) {
      throw new BadRequestException(
        'El abono es mayor que el saldo pendiente de la deuda',
      );
    }

    const actualizada = await this.prisma.debt.update({
      where: { id },
      data: { remainingAmount: deuda.remainingAmount - BigInt(dto.amount) },
    });

    return this.conProgreso(actualizada);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.prisma.debt.delete({ where: { id } });
  }

  private conProgreso(deuda: Debt): DeudaConProgreso {
    const abonado = deuda.totalAmount - deuda.remainingAmount;

    return {
      ...deuda,
      paid: abonado,
      percentagePaid:
        deuda.totalAmount === 0n
          ? 0
          : Number((abonado * 1000n) / deuda.totalAmount) / 10,
      settled: deuda.remainingAmount === 0n,
    };
  }
}
