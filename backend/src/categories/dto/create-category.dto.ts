import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryKind } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Mascotas' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;

  @ApiPropertyOptional({
    description: 'Nombre de un SF Symbol (ver docs/09 §4)',
    example: 'pawprint.fill',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string;

  @ApiProperty({ enum: [CategoryKind.EXPENSE, CategoryKind.INCOME] })
  @IsEnum(CategoryKind, { message: 'kind debe ser EXPENSE o INCOME' })
  kind!: CategoryKind;

  @ApiPropertyOptional({
    description: 'Slot de color de la paleta de gráficos (1..8)',
    minimum: 1,
    maximum: 8,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  colorSlot?: number;
}
