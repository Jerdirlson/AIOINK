import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type UsuarioAutenticado,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService, type RespuestaAuth } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

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

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Devuelve el perfil del usuario autenticado' })
  async me(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: usuario.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        currency: true,
        country: true,
        locale: true,
        plan: true,
        createdAt: true,
      },
    });
  }
}
