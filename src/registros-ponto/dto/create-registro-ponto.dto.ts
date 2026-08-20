import { ApiProperty } from '@nestjs/swagger';
import { TipoRegistro } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateRegistroPontoDto {
  @ApiProperty()
  @IsString()
  colaboradorId: string;

  @ApiProperty()
  @IsDateString()
  dataHora: string;

  @ApiProperty({ enum: TipoRegistro })
  @IsEnum(TipoRegistro)
  tipo: TipoRegistro;

  @ApiProperty({ required: false, default: 'CARTAO_MECANICO' })
  @IsOptional()
  @IsString()
  origem?: string;
}
