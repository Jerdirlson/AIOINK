import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

/**
 * La categoría no se cambia: mover el límite a otra categoría es crear otro
 * presupuesto, y así el histórico de cada uno se mantiene claro.
 */
export class UpdateBudgetDto {
  @ApiProperty({ description: 'Nuevo límite en centavos, positivo' })
  @IsInt()
  @IsPositive()
  amount!: number;
}
