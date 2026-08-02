import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jerdirlson@gmail.com' })
  @IsEmail({}, { message: 'El correo no es válido' })
  email!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  password!: string;
}
