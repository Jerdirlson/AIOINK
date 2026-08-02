import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsUUID } from 'class-validator';

export class CreateBudgetDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Categoría de gasto a la que se le pone límite',
  })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({
    description: 'Límite del periodo en centavos, positivo',
    example: 50000000,
  })
  @IsInt({ message: 'El límite debe ser un entero en centavos' })
  @IsPositive({ message: 'El límite debe ser positivo' })
  amount!: number;
}
