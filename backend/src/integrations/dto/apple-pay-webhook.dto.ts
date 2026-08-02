import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Lo que envía la automatización "Transacción" de Atajos tras un pago con
 * Apple Pay (ver docs/06).
 */
export class ApplePayWebhookDto {
  @ApiProperty({
    description: 'Comercio, tal como lo reporta Apple Pay',
    example: 'Juan Valdez',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  merchant!: string;

  @ApiProperty({
    description:
      'Monto del pago en centavos, siempre positivo. Se registra como gasto.',
    example: 1500000,
  })
  @IsInt({ message: 'amountCents debe ser un entero en centavos' })
  @IsPositive({ message: 'amountCents debe ser positivo' })
  amountCents!: number;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Momento del pago. Si no viene, se usa la hora de recepción.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  occurredAt?: Date;

  @ApiPropertyOptional({
    description:
      'Identificador único del pago. Si se reenvía el mismo, no se duplica.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalId?: string;
}
