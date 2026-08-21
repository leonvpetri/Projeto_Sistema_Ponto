import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateColaboradorDto {
  @ApiProperty()
  @IsString()
  nome: string;

  @ApiProperty()
  @IsString()
  cpf: string;

  @ApiProperty()
  @IsString()
  setor: string;

  @ApiProperty({ required: false, example: '5534999999999', description: 'WhatsApp (E.164), usado para identificar quem manda foto do cartão de ponto' })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiProperty()
  @IsString()
  jornadaId: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @ApiProperty({ required: false, description: 'Obrigatório para jornadas ESCALA_12X36' })
  @IsOptional()
  @IsDateString()
  dataBaseEscala12x36?: string;
}
