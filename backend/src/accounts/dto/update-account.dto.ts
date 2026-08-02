import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateAccountDto } from './create-account.dto';

/**
 * El saldo inicial no se edita por aquí: es una transacción, y se corrige
 * editando esa transacción. Así el saldo nunca deja de ser SUM(amount).
 */
export class UpdateAccountDto extends PartialType(
  OmitType(CreateAccountDto, ['initialBalance'] as const),
) {
  @ApiPropertyOptional({ description: 'Archiva la cuenta sin borrarla' })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
