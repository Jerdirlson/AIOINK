import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBudgetDto } from './dto/create-budget.dto';
import type { UpdateBudgetDto } from './dto/update-budget.dto';

/**
 * Umbrales de alerta. Coinciden con los colores de estado del sistema de
 * diseño (docs/09 §8): advertencia al 80 %, crítico al superar el límite.
 */
const UMBRAL_ADVERTENCIA = 0.8;

export type EstadoPresupuesto = 'OK' | 'WARNING' | 'EXCEEDED';

export interface PresupuestoConGasto {
  id: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    icon: string;
    colorSlot: number | null;
  };
  /** Límite del periodo, en centavos. */
  amount: bigint;
  /** Gastado en el periodo, en centavos y positivo. */
  spent: bigint;
  /** Lo que queda. Negativo si se pasó del límite. */
  remaining: bigint;
  /** 0..100+ con un decimal. Puede pasar de 100 si se excedió. */
  percentage: number;
  status: EstadoPresupuesto;
  periodStart: Date;
  periodEnd: Date;
}

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<PresupuestoConGasto[]> {
    const presupuestos = await this.prisma.budget.findMany({
      where: { userId },
      include: {
        category: {
          select: { id: true, name: true, icon: true, colorSlot: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (presupuestos.length === 0) {
      return [];
    }

    const { inicio, fin } = this.periodoActual();

    // Una sola agregación para todos los presupuestos, no una por cada uno.
    const gastos = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        categoryId: { in: presupuestos.map((p) => p.categoryId) },
        occurredAt: { gte: inicio, lte: fin },
        // Solo salidas: un reembolso (monto positivo) resta gasto.
        amount: { lt: 0 },
      },
      _sum: { amount: true },
    });

    const porCategoria = new Map(
      gastos.map((g) => [g.categoryId, -(g._sum.amount ?? 0n)]),
    );

    return presupuestos.map((presupuesto) =>
      this.componer(
        presupuesto,
        porCategoria.get(presupuesto.categoryId) ?? 0n,
        inicio,
        fin,
      ),
    );
  }

  async findOne(userId: string, id: string): Promise<PresupuestoConGasto> {
    const presupuesto = await this.prisma.budget.findFirst({
      where: { id, userId },
      include: {
        category: {
          select: { id: true, name: true, icon: true, colorSlot: true },
        },
      },
    });

    if (!presupuesto) {
      throw new NotFoundException('El presupuesto no existe');
    }

    const { inicio, fin } = this.periodoActual();
    const gastado = await this.gastoDeCategoria(
      userId,
      presupuesto.categoryId,
      inicio,
      fin,
    );

    return this.componer(presupuesto, gastado, inicio, fin);
  }

  async create(
    userId: string,
    dto: CreateBudgetDto,
  ): Promise<PresupuestoConGasto> {
    const categoria = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, userId },
      select: { id: true, kind: true, isSystem: true },
    });

    if (!categoria) {
      throw new NotFoundException('La categoría no existe o no es tuya');
    }

    // Un presupuesto es un tope de gasto: no tiene sentido sobre ingresos ni
    // sobre las categorías de sistema (saldo inicial, transferencias).
    if (categoria.isSystem || categoria.kind !== CategoryKind.EXPENSE) {
      throw new BadRequestException(
        'Solo se puede presupuestar una categoría de gasto',
      );
    }

    const creado = await this.prisma.budget.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        amount: BigInt(dto.amount),
      },
    });

    return this.findOne(userId, creado.id);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateBudgetDto,
  ): Promise<PresupuestoConGasto> {
    await this.findOne(userId, id);

    await this.prisma.budget.update({
      where: { id },
      data: { amount: BigInt(dto.amount) },
    });

    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.prisma.budget.delete({ where: { id } });
  }

  private async gastoDeCategoria(
    userId: string,
    categoryId: string,
    inicio: Date,
    fin: Date,
  ): Promise<bigint> {
    const { _sum } = await this.prisma.transaction.aggregate({
      where: {
        userId,
        categoryId,
        occurredAt: { gte: inicio, lte: fin },
        amount: { lt: 0 },
      },
      _sum: { amount: true },
    });

    return -(_sum.amount ?? 0n);
  }

  private componer(
    presupuesto: {
      id: string;
      categoryId: string;
      amount: bigint;
      category: {
        id: string;
        name: string;
        icon: string;
        colorSlot: number | null;
      };
    },
    gastado: bigint,
    inicio: Date,
    fin: Date,
  ): PresupuestoConGasto {
    const porcentaje = this.porcentaje(gastado, presupuesto.amount);

    return {
      id: presupuesto.id,
      categoryId: presupuesto.categoryId,
      category: presupuesto.category,
      amount: presupuesto.amount,
      spent: gastado,
      remaining: presupuesto.amount - gastado,
      percentage: porcentaje,
      status: this.estado(gastado, presupuesto.amount),
      periodStart: inicio,
      periodEnd: fin,
    };
  }

  private estado(gastado: bigint, limite: bigint): EstadoPresupuesto {
    if (gastado > limite) return 'EXCEEDED';

    // Se compara en enteros para no pasar por punto flotante:
    // gastado / limite >= 0.8  ⇔  gastado * 100 >= limite * 80
    if (gastado * 100n >= limite * BigInt(UMBRAL_ADVERTENCIA * 100)) {
      return 'WARNING';
    }

    return 'OK';
  }

  private porcentaje(parte: bigint, total: bigint): number {
    if (total === 0n) return 0;
    return Number((parte * 1000n) / total) / 10;
  }

  /** Mes calendario en curso, en UTC. */
  private periodoActual(): { inicio: Date; fin: Date } {
    const ahora = new Date();

    return {
      inicio: new Date(
        Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1),
      ),
      fin: new Date(
        Date.UTC(
          ahora.getUTCFullYear(),
          ahora.getUTCMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ),
      ),
    };
  }
}
