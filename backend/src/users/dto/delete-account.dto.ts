import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({
    description:
      'Contraseña actual. Se exige porque la eliminación es irreversible y borra todos los datos.',
  })
  @IsString()
  @MaxLength(128)
  password!: string;
}
