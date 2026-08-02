import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SavingGoal } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ContribuirDto,
  CreateSavingGoalDto,
  UpdateSavingGoalDto,
} from './dto/saving-goal.dto';

export interface MetaConProgreso extends SavingGoal {
  /** Lo que falta, en centavos. 0 si ya se alcanzó. */
  remaining: bigint;
  /** 0..100 con un decimal. Se tope en 100 aunque se ahorre de más. */
  percentage: number;
  completed: boolean;
}

@Injectable()
export class SavingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<MetaConProgreso[]> {
    const metas = await this.prisma.savingGoal.findMany({
      where: { userId },
      orderBy: [{ targetDate: 'asc' }, { createdAt: 'asc' }],
    });

    return metas.map((meta) => this.conProgreso(meta));
  }

  async findOne(userId: string, id: string): Promise<MetaConProgreso> {
    const meta = await this.prisma.savingGoal.findFirst({
      where: { id, userId },
    });

    if (!meta) {
      throw new NotFoundException('La meta no existe');
    }

    return this.conProgreso(meta);
  }

  async create(
    userId: string,
    dto: CreateSavingGoalDto,
  ): Promise<MetaConProgreso> {
    const meta = await this.prisma.savingGoal.create({
      data: {
        userId,
        name: dto.name.trim(),
        targetAmount: BigInt(dto.targetAmount),
        currentAmount: BigInt(dto.currentAmount ?? 0),
        targetDate: dto.targetDate ?? null,
      },
    });

    return this.conProgreso(meta);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateSavingGoalDto,
  ): Promise<MetaConProgreso> {
    await this.findOne(userId, id);

    const meta = await this.prisma.savingGoal.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.targetAmount !== undefined
          ? { targetAmount: BigInt(dto.targetAmount) }
          : {}),
        ...(dto.currentAmount !== undefined
          ? { currentAmount: BigInt(dto.currentAmount) }
          : {}),
        ...(dto.targetDate !== undefined ? { targetDate: dto.targetDate } : {}),
      },
    });

    return this.conProgreso(meta);
  }

  /**
   * Registra un aporte. Acepta montos negativos para corregir un error o
   * retirar, pero el acumulado nunca baja de 0: un ahorro negativo no
   * significa nada.
   */
  async contribuir(
    userId: string,
    id: string,
    dto: ContribuirDto,
  ): Promise<MetaConProgreso> {
    if (dto.amount === 0) {
      throw new BadRequestException('El aporte no puede ser 0');
    }

    const meta = await this.findOne(userId, id);
    const nuevo = meta.currentAmount + BigInt(dto.amount);

    if (nuevo < 0n) {
      throw new BadRequestException(
        'El retiro es mayor que lo ahorrado en esta meta',
      );
    }

    const actualizada = await this.prisma.savingGoal.update({
      where: { id },
      data: { currentAmount: nuevo },
    });

    return this.conProgreso(actualizada);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.prisma.savingGoal.delete({ where: { id } });
  }

  private conProgreso(meta: SavingGoal): MetaConProgreso {
    const restante = meta.targetAmount - meta.currentAmount;

    return {
      ...meta,
      remaining: restante > 0n ? restante : 0n,
      percentage: this.porcentaje(meta.currentAmount, meta.targetAmount),
      completed: meta.currentAmount >= meta.targetAmount,
    };
  }

  private porcentaje(parte: bigint, total: bigint): number {
    if (total <= 0n) return 0;
    const bruto = Number((parte * 1000n) / total) / 10;
    return Math.min(bruto, 100);
  }
}
