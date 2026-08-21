import { ApiProperty } from '@nestjs/swagger';
import { TipoRegistro } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsOptional, IsString, Matches, MinLength, ValidateNested } from 'class-validator';

/** Uma batida corrigida pelo RH, no formato já usado pelo lançamento manual (ver CreateRegistroPontoDto). */
export class RegistroExtraidoDto {
  @ApiProperty()
  @IsDateString()
  dataHora: string;

  @ApiProperty({ enum: TipoRegistro })
  @IsEnum(TipoRegistro)
  tipo: TipoRegistro;
}

/** Observação de um dia (ex.: "Médico"), independente de haver batida nesse dia. */
export class ObservacaoExtraidaDto {
  @ApiProperty({ example: '2026-08-20' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'data deve estar no formato YYYY-MM-DD' })
  data: string;

  @ApiProperty({ example: 'Médico' })
  @IsString()
  @MinLength(1)
  texto: string;
}

export class ConfirmarExtracaoDto {
  @ApiProperty({
    type: [RegistroExtraidoDto],
    description: 'Batidas finais (já corrigidas pelo RH, se necessário) que viram RegistroPonto ao confirmar',
  })
  @ValidateNested({ each: true })
  @Type(() => RegistroExtraidoDto)
  @ArrayMinSize(1)
  registros: RegistroExtraidoDto[];

  @ApiProperty({ type: [ObservacaoExtraidaDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ObservacaoExtraidaDto)
  observacoes?: ObservacaoExtraidaDto[];
}
