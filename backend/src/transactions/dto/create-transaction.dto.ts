import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionSource, TransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  NotEquals,
} from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  accountId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({
    description:
      'Monto en centavos CON SIGNO: negativo = gasto, positivo = ingreso. No puede ser 0.',
    example: -8000000,
  })
  @IsInt({ message: 'El monto debe ser un entero en centavos' })
  @NotEquals(0, { message: 'El monto no puede ser 0' })
  amount!: number;

  @ApiProperty({
    enum: TransactionType,
    description:
      'Debe concordar con el signo del monto: EXPENSE negativo, INCOME positivo.',
  })
  @IsEnum(TransactionType)
  type!: TransactionType;

  @ApiProperty({ example: 'Almuerzo con el equipo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate({ message: 'occurredAt debe ser una fecha válida' })
  occurredAt!: Date;

  @ApiPropertyOptional({ enum: TransactionSource, default: 'MANUAL' })
  @IsOptional()
  @IsEnum(TransactionSource)
  source?: TransactionSource;

  @ApiPropertyOptional({
    description: 'Id en el sistema de origen, para deduplicar importaciones',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalId?: string;
}
