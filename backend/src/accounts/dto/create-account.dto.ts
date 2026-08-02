import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({ example: 'Principal' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;

  @ApiProperty({ enum: AccountType })
  @IsEnum(AccountType)
  type!: AccountType;

  @ApiPropertyOptional({
    description:
      'Saldo de apertura en centavos (con signo). Se registra como una transacción de la categoría "Saldo inicial".',
    example: 1000000000,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  initialBalance?: number;
}
