import { ApiProperty } from '@nestjs/swagger';
import { TipoAfastamento } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

const TIPOS_COM_MOTIVO_OBRIGATORIO: TipoAfastamento[] = [TipoAfastamento.OUTRO, TipoAfastamento.MOTIVO_PESSOAL];

export class CreateAfastamentoDto {
  @ApiProperty()
  @IsString()
  colaboradorId: string;

  @ApiProperty()
  @IsDateString()
  dataInicio: string;

  @ApiProperty()
  @IsDateString()
  dataFim: string;

  @ApiProperty({ enum: TipoAfastamento })
  @IsEnum(TipoAfastamento)
  tipo: TipoAfastamento;

  @ApiProperty()
  @IsBoolean()
  abonado: boolean;

  @ApiProperty({ required: false, description: 'Obrigatório quando tipo é OUTRO ou MOTIVO_PESSOAL' })
  @ValidateIf((o: CreateAfastamentoDto) => TIPOS_COM_MOTIVO_OBRIGATORIO.includes(o.tipo))
  @IsNotEmpty({ message: 'motivo é obrigatório quando tipo é OUTRO ou MOTIVO_PESSOAL' })
  @IsString()
  motivo?: string;

  @ApiProperty()
  @IsString()
  registradoPor: string;
}
