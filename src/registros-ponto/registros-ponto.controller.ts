import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RegistrosPontoService } from './registros-ponto.service';
import { CreateRegistroPontoDto } from './dto/create-registro-ponto.dto';
import { ListarRegistrosPontoQueryDto } from './dto/listar-registros-ponto-query.dto';
import { SubstituirRegistrosDoDiaDto } from './dto/substituir-registros-dia.dto';
import { periodoDoMes } from '../apuracao/date-utils';
import { ExtracaoFotoService } from './extracao-foto.service';

@ApiTags('registros-ponto')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.RH)
@Controller('registros-ponto')
export class RegistrosPontoController {
  constructor(
    private registrosPontoService: RegistrosPontoService,
    private extracaoFotoService: ExtracaoFotoService,
  ) {}

  @Post()
  create(@Body() dto: CreateRegistroPontoDto) {
    return this.registrosPontoService.create(dto);
  }

  @Put('dia')
  substituirDia(@Body() dto: SubstituirRegistrosDoDiaDto) {
    return this.registrosPontoService.substituirRegistrosDoDia(dto);
  }

  @Get()
  findDoPeriodo(@Query() dto: ListarRegistrosPontoQueryDto) {
    if (!dto.data && !dto.mes) {
      throw new BadRequestException('Informe data (dia) ou mes (mês).');
    }
    if (dto.data && dto.mes) {
      throw new BadRequestException('Informe apenas um dos dois: data ou mes.');
    }

    const { inicio, fim } = dto.mes
      ? periodoDoMes(dto.mes)
      : (() => {
          const inicioDia = new Date(`${dto.data}T00:00:00`);
          const fimDia = new Date(inicioDia.getFullYear(), inicioDia.getMonth(), inicioDia.getDate() + 1);
          return { inicio: inicioDia, fim: fimDia };
        })();

    return this.registrosPontoService.findByColaboradorEPeriodo(dto.colaboradorId, inicio, fim);
  }

  @Post('extrair-foto')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('foto', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(new BadRequestException('O arquivo enviado precisa ser uma imagem.'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  extrairFoto(@UploadedFile() foto: Express.Multer.File) {
    if (!foto) throw new BadRequestException('Envie uma foto no campo "foto".');
    return this.extracaoFotoService.extrair(foto.buffer, foto.mimetype);
  }
}
