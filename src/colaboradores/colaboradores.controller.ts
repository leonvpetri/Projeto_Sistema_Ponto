import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ColaboradoresService } from './colaboradores.service';
import { CreateColaboradorDto } from './dto/create-colaborador.dto';
import { UpdateColaboradorDto } from './dto/update-colaborador.dto';

@ApiTags('colaboradores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('colaboradores')
export class ColaboradoresController {
  constructor(private colaboradoresService: ColaboradoresService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateColaboradorDto) {
    return this.colaboradoresService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.RH)
  findAll() {
    return this.colaboradoresService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.RH)
  findOne(@Param('id') id: string) {
    return this.colaboradoresService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateColaboradorDto) {
    return this.colaboradoresService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.colaboradoresService.remove(id);
  }
}
