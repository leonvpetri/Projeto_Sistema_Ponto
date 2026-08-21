import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ObservacoesDiaService } from './observacoes-dia.service';
import { CreateObservacaoDiaDto } from './dto/create-observacao-dia.dto';

@ApiTags('observacoes-dia')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.RH)
@Controller('observacoes-dia')
export class ObservacoesDiaController {
  constructor(private observacoesDiaService: ObservacoesDiaService) {}

  @Post()
  create(@Body() dto: CreateObservacaoDiaDto) {
    return this.observacoesDiaService.upsert(dto);
  }
}
