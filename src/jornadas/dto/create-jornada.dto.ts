import { ApiProperty } from '@nestjs/swagger';
import { TipoEscala } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateJornadaDto {
  @ApiProperty()
  @IsString()
  nome: string;

  @ApiProperty({ enum: TipoEscala })
  @IsEnum(TipoEscala)
  tipo: TipoEscala;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  horaEntradaPadrao?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  horaSaidaPadrao?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  duracaoIntervaloMin?: number;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  toleranciaIntervaloMin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  cargaDiariaEsperadaMin?: number;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  temAdicionalNoturno?: boolean;

  @ApiProperty({ required: false, default: '22:00' })
  @IsOptional()
  @IsString()
  horarioNoturnoInicio?: string;

  @ApiProperty({ required: false, default: '05:00' })
  @IsOptional()
  @IsString()
  horarioNoturnoFim?: string;

  @ApiProperty({ required: false, default: 0.2 })
  @IsOptional()
  @IsNumber()
  percentualAdicionalNoturno?: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  horaNoturnaReduzida?: boolean;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  toleranciaBancoHorasMin?: number;
}
