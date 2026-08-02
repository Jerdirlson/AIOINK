import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSavingGoalDto {
  @ApiProperty({ example: 'Viaje a fin de año' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @ApiProperty({
    description: 'Monto objetivo en centavos, positivo',
    example: 500000000,
  })
  @IsInt()
  @IsPositive({ message: 'El objetivo debe ser positivo' })
  targetAmount!: number;

  @ApiPropertyOptional({
    description: 'Cuánto llevas ya ahorrado, en centavos',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'El acumulado no puede ser negativo' })
  currentAmount?: number;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  targetDate?: Date;
}

export class UpdateSavingGoalDto extends PartialType(CreateSavingGoalDto) {}

export class ContribuirDto {
  @ApiProperty({
    description:
      'Aporte en centavos. Puede ser negativo para corregir o retirar.',
    example: 20000000,
  })
  @IsInt({ message: 'El aporte debe ser un entero en centavos' })
  amount!: number;
}
