import { Injectable, Logger } from '@nestjs/common';
import {
  type ShortcutToken,
  type Transaction,
  TransactionSource,
  TransactionType,
} from '@prisma/client';
import { CategoriesService } from '../categories/categories.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ApplePayWebhookDto } from './dto/apple-pay-webhook.dto';

export interface ResultadoApplePay {
  transaction: Transaction;
  /** true si el pago ya estaba registrado y no se creó nada nuevo. */
  duplicated: boolean;
}

@Injectable()
export class ApplePayService {
  private readonly logger = new Logger(ApplePayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
  ) {}

  async registrar(
    token: ShortcutToken,
    dto: ApplePayWebhookDto,
  ): Promise<ResultadoApplePay> {
    // Idempotencia: el Atajo puede reintentar si se cae la red. Reenviar el
    // mismo pago devuelve el que ya existe en vez de duplicarlo.
    if (dto.externalId) {
      const existente = await this.prisma.transaction.findFirst({
        where: {
          userId: token.userId,
          source: TransactionSource.APPLE_PAY_SHORTCUT,
          externalId: dto.externalId,
        },
      });

      if (existente) {
        return { transaction: existente, duplicated: true };
      }
    }

    const categoria = await this.categories.obtenerParaAutoCategorizar(
      token.userId,
    );

    const transaccion = await this.prisma.transaction.create({
      data: {
        userId: token.userId,
        accountId: token.accountId,
        categoryId: categoria.id,
        // El Atajo manda el monto positivo; aquí se vuelve gasto.
        amount: -BigInt(dto.amountCents),
        type: TransactionType.EXPENSE,
        description: dto.merchant.trim(),
        occurredAt: dto.occurredAt ?? new Date(),
        source: TransactionSource.APPLE_PAY_SHORTCUT,
        externalId: dto.externalId ?? null,
      },
    });

    this.logger.log(
      `Apple Pay: registrado "${dto.merchant}" para el usuario ${token.userId}`,
    );

    return { transaction: transaccion, duplicated: false };
  }
}
