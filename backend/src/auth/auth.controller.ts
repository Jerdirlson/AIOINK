import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AuthService, type RespuestaAuth } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Crea una cuenta y su catálogo de categorías por defecto',
  })
  register(@Body() dto: RegisterDto): Promise<RespuestaAuth> {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicia sesión y devuelve un JWT' })
  login(@Body() dto: LoginDto): Promise<RespuestaAuth> {
    return this.auth.login(dto);
  }
}
