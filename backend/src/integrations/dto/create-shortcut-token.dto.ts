import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateShortcutTokenDto {
  @ApiProperty({
    description: 'Nombre para reconocerlo en la lista',
    example: 'iPhone de Jerdirlson',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Cuenta a la que se cargarán los pagos de Apple Pay',
  })
  @IsUUID()
  accountId!: string;
}
