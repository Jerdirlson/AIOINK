import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTransactionDto } from './create-transaction.dto';

/**
 * `source` y `externalId` no se editan: identifican de dónde vino el dato y
 * cambiarlos rompería la deduplicación de importaciones.
 */
export class UpdateTransactionDto extends PartialType(
  OmitType(CreateTransactionDto, ['source', 'externalId'] as const),
) {}
