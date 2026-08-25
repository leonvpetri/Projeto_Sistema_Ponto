import { ApiProperty } from '@nestjs/swagger';
import { TipoRegistro } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';

/** Uma batida final do dia, no mesmo formato do lançamento manual (ver CreateRegistroPontoDto). */
export class RegistroDoDiaDto {
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

/**
 * Substitui (apaga + recria) todas as batidas de um colaborador num dia —
 * usado pela edição de um dia já lançado, pra não duplicar RegistroPonto
 * (ver ADR/discussão: PATCH por id foi descartado a favor de apagar+recriar
 * por colaborador+data, mesma janela de busca do motor de apuração).
 */
export class SubstituirRegistrosDoDiaDto {
  @ApiProperty()
  @IsString()
  colaboradorId: string;

  @ApiProperty({ example: '2026-08-17', description: 'Dia civil sendo editado (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'data deve estar no formato YYYY-MM-DD' })
  data: string;

  @ApiProperty({ type: [RegistroDoDiaDto], description: 'Estado final das batidas do dia (substitui tudo que já existia na janela)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistroDoDiaDto)
  @ArrayMinSize(0)
  registros: RegistroDoDiaDto[];
}
