import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTransferDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  fromAccountId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  toAccountId!: string;

  @ApiProperty({
    description: 'Monto a transferir en centavos, siempre positivo',
    example: 50000000,
  })
  @IsInt()
  @IsPositive({ message: 'El monto de una transferencia debe ser positivo' })
  amount!: number;

  @ApiPropertyOptional({ example: 'Paso a la cuenta de ahorros' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  description?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  occurredAt!: Date;
}
