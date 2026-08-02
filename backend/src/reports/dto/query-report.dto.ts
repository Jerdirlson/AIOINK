import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class QueryReportDto {
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Inicio del rango (inclusive). Por defecto, el mes actual.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Fin del rango (inclusive). Por defecto, el mes actual.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Limita el reporte a una cuenta',
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;
}

export class QueryMonthlyReportDto {
  @ApiPropertyOptional({
    description: 'Cuántos meses hacia atrás incluir',
    default: 6,
    minimum: 1,
    maximum: 36,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36)
  months?: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  accountId?: string;
}
