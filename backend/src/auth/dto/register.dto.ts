import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'jerdirlson@gmail.com' })
  @IsEmail({}, { message: 'El correo no es válido' })
  email!: string;

  @ApiProperty({ example: 'Jerdirlson Santamaria' })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(80)
  name!: string;

  @ApiProperty({ minLength: 8, example: 'una-contrasena-segura' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128)
  password!: string;
}
