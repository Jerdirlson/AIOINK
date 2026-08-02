import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type UsuarioAutenticado,
} from '../common/decorators/current-user.decorator';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  findMe(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.users.findProfile(usuario.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Edita el perfil (no el correo ni la contraseña)' })
  updateMe(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.users.updateProfile(usuario.id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Elimina la cuenta y todos sus datos de forma irreversible (Ley 1581)',
  })
  deleteMe(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: DeleteAccountDto,
  ) {
    return this.users.deleteAccount(usuario.id, dto);
  }
}
