import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

/**
 * `kind` no se puede cambiar: mover una categoría de gasto a ingreso
 * invalidaría el signo de todas sus transacciones existentes.
 */
export class UpdateCategoryDto extends PartialType(
  OmitType(CreateCategoryDto, ['kind'] as const),
) {}
