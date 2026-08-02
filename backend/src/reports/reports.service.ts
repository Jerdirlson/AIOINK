import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  QueryMonthlyReportDto,
  QueryReportDto,
} from './dto/query-report.dto';

export interface ResumenPeriodo {
  from: Date;
  to: Date;
  /** Suma de entradas reales, en centavos (positivo). */
  income: bigint;
  /** Suma de salidas reales, en centavos (positivo). */
  expense: bigint;
  /** income − expense. Negativo = se gastó más de lo que entró. */
  balance: bigint;
}

export interface CategoriaEnReporte {
  categoryId: string;
  name: string;
  icon: string;
  colorSlot: number | null;
  /** Total del periodo en centavos, positivo. */
  total: bigint;
  /** Porcentaje sobre el total del reporte, con un decimal. */
  percentage: number;
}

export interface ReportePorCategoria {
  from: Date;
  to: Date;
  total: bigint;
  items: CategoriaEnReporte[];
}

export interface MesEnReporte {
  month: string;
  income: bigint;
  expense: bigint;
  balance: bigint;
}

const MESES_POR_DEFECTO = 6;
const MAX_CATEGORIAS_CON_COLOR = 8;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(
    userId: string,
    query: QueryReportDto,
  ): Promise<ResumenPeriodo> {
    const { from, to } = this.resolverRango(query);

    const porSigno = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: this.filtroBase(userId, from, to, query.accountId),
      _sum: { amount: true },
    });

    let income = 0n;
    let expense = 0n;

    for (const fila of porSigno) {
      const suma = fila._sum.amount ?? 0n;
      if (suma > 0n) {
        income += suma;
      } else {
        expense += -suma;
      }
    }

    return { from, to, income, expense, balance: income - expense };
  }

  async byCategory(
    userId: string,
    query: QueryReportDto,
  ): Promise<ReportePorCategoria> {
    const { from, to } = this.resolverRango(query);

    const agrupado = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        ...this.filtroBase(userId, from, to, query.accountId),
        // Solo salidas: el reporte por categoría es de gasto.
        amount: { lt: 0 },
      },
      _sum: { amount: true },
    });

    if (agrupado.length === 0) {
      return { from, to, total: 0n, items: [] };
    }

    const categorias = await this.prisma.category.findMany({
      where: { id: { in: agrupado.map((a) => a.categoryId) } },
      select: { id: true, name: true, icon: true, colorSlot: true },
    });

    const porId = new Map(categorias.map((c) => [c.id, c]));

    const total = agrupado.reduce(
      (acc, fila) => acc + -(fila._sum.amount ?? 0n),
      0n,
    );

    const items = agrupado
      .map((fila) => {
        const categoria = porId.get(fila.categoryId);
        const montoTotal = -(fila._sum.amount ?? 0n);

        return {
          categoryId: fila.categoryId,
          name: categoria?.name ?? 'Desconocida',
          icon: categoria?.icon ?? 'ellipsis.circle.fill',
          colorSlot: categoria?.colorSlot ?? null,
          total: montoTotal,
          percentage: this.porcentaje(montoTotal, total),
        };
      })
      // De mayor a menor gasto: es el orden en que se leen las barras.
      .sort((a, b) => (b.total > a.total ? 1 : b.total < a.total ? -1 : 0));

    return { from, to, total, items: this.agruparSobrantes(items) };
  }

  /**
   * Serie mensual de ingresos y gastos. Usa SQL directo porque Prisma no sabe
   * agrupar por mes; `date_trunc` lo resuelve en una sola consulta en vez de
   * traerse todas las transacciones a memoria.
   */
  async monthly(
    userId: string,
    query: QueryMonthlyReportDto,
  ): Promise<MesEnReporte[]> {
    const meses = query.months ?? MESES_POR_DEFECTO;

    const desde = new Date();
    desde.setUTCDate(1);
    desde.setUTCHours(0, 0, 0, 0);
    desde.setUTCMonth(desde.getUTCMonth() - (meses - 1));

    const filas = await this.prisma.$queryRaw<
      { month: Date; income: bigint; expense: bigint }[]
    >`
      SELECT
        date_trunc('month', t."occurredAt") AS month,
        COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0)::bigint  AS income,
        COALESCE(SUM(CASE WHEN t.amount < 0 THEN -t.amount ELSE 0 END), 0)::bigint AS expense
      FROM transactions t
      JOIN categories c ON c.id = t."categoryId"
      WHERE t."userId" = ${userId}
        AND t."occurredAt" >= ${desde}
        AND c."isSystem" = false
        ${
          query.accountId
            ? Prisma.sql`AND t."accountId" = ${query.accountId}`
            : Prisma.empty
        }
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    return filas.map((f) => ({
      month: f.month.toISOString().slice(0, 7),
      income: f.income,
      expense: f.expense,
      balance: f.income - f.expense,
    }));
  }

  /**
   * Filtro común de los reportes.
   *
   * Excluye las transacciones de categorías del sistema: el "Saldo inicial"
   * no es un ingreso (es dinero que ya existía) y una transferencia entre
   * cuentas propias no es ni gasto ni ingreso — contarlos inflaría los
   * totales y descuadraría los porcentajes.
   */
  private filtroBase(
    userId: string,
    from: Date,
    to: Date,
    accountId?: string,
  ): Prisma.TransactionWhereInput {
    return {
      userId,
      occurredAt: { gte: from, lte: to },
      category: { isSystem: false },
      ...(accountId ? { accountId } : {}),
    };
  }

  /** Si no se pide rango, se reporta el mes actual completo. */
  private resolverRango(query: QueryReportDto): { from: Date; to: Date } {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('"from" no puede ser posterior a "to"');
    }

    const ahora = new Date();

    const from =
      query.from ??
      new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1));

    const to =
      query.to ??
      new Date(
        Date.UTC(
          ahora.getUTCFullYear(),
          ahora.getUTCMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ),
      );

    return { from, to };
  }

  private porcentaje(parte: bigint, total: bigint): number {
    if (total === 0n) {
      return 0;
    }
    // Se calcula en enteros (décimas de punto) para no perder precisión al
    // pasar por Number con montos grandes.
    return Number((parte * 1000n) / total) / 10;
  }

  /**
   * La paleta de gráficos tiene 8 slots fijos (docs/09 §8). A partir de la
   * novena categoría se agrupa todo en "Otros" en vez de inventar colores.
   */
  private agruparSobrantes(items: CategoriaEnReporte[]): CategoriaEnReporte[] {
    if (items.length <= MAX_CATEGORIAS_CON_COLOR) {
      return items;
    }

    const principales = items.slice(0, MAX_CATEGORIAS_CON_COLOR - 1);
    const resto = items.slice(MAX_CATEGORIAS_CON_COLOR - 1);

    const totalResto = resto.reduce((acc, i) => acc + i.total, 0n);
    const porcentajeResto =
      Math.round(resto.reduce((acc, i) => acc + i.percentage, 0) * 10) / 10;

    return [
      ...principales,
      {
        categoryId: 'otros',
        name: 'Otros',
        icon: 'ellipsis.circle.fill',
        colorSlot: null,
        total: totalResto,
        percentage: porcentajeResto,
      },
    ];
  }
}
