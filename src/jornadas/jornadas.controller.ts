import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { JornadasService } from './jornadas.service';
import { CreateJornadaDto } from './dto/create-jornada.dto';
import { UpdateJornadaDto } from './dto/update-jornada.dto';

@ApiTags('jornadas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('jornadas')
export class JornadasController {
  constructor(private jornadasService: JornadasService) {}

  @Post()
  create(@Body() dto: CreateJornadaDto) {
    return this.jornadasService.create(dto);
  }

  @Get()
  findAll() {
    return this.jornadasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jornadasService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJornadaDto) {
    return this.jornadasService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jornadasService.remove(id);
  }
}
