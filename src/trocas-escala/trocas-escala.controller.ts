import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TrocasEscalaService } from './trocas-escala.service';
import { CreateTrocaEscalaDto } from './dto/create-troca-escala.dto';

@ApiTags('trocas-escala')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.RH)
@Controller('trocas-escala')
export class TrocasEscalaController {
  constructor(private trocasEscalaService: TrocasEscalaService) {}

  @Post()
  create(@Body() dto: CreateTrocaEscalaDto) {
    return this.trocasEscalaService.create(dto);
  }
}
