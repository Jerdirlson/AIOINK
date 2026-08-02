import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * El correo no se edita por aquí: cambiarlo es un flujo aparte que exige
 * verificar el correo nuevo. La contraseña tampoco (necesita la actual).
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jerdirlson Santamaria' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'avatarUrl debe ser una URL válida' })
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'COP' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ example: 'CO' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ enum: ['es', 'en'] })
  @IsOptional()
  @IsIn(['es', 'en'], { message: 'locale debe ser es o en' })
  locale?: string;
}
