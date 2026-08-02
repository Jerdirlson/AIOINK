import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DebtDirection } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDebtDto {
  @ApiProperty({ example: 'Préstamo del carro' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @ApiPropertyOptional({
    description: 'A quién le debes, o quién te debe',
    example: 'Banco de Bogotá',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  counterparty?: string;

  @ApiProperty({ enum: DebtDirection })
  @IsEnum(DebtDirection)
  direction!: DebtDirection;

  @ApiProperty({
    description: 'Monto original en centavos, positivo',
    example: 1200000000,
  })
  @IsInt()
  @IsPositive({ message: 'El monto debe ser positivo' })
  totalAmount!: number;

  @ApiPropertyOptional({
    description:
      'Cuánto queda pendiente en centavos. Si no viene, se asume que es el total.',
  })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'El pendiente no puede ser negativo' })
  remainingAmount?: number;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;
}

export class UpdateDebtDto extends PartialType(CreateDebtDto) {}

export class AbonarDto {
  @ApiProperty({
    description: 'Abono en centavos, positivo. Reduce el pendiente.',
    example: 10000000,
  })
  @IsInt({ message: 'El abono debe ser un entero en centavos' })
  @IsPositive({ message: 'El abono debe ser positivo' })
  amount!: number;
}
