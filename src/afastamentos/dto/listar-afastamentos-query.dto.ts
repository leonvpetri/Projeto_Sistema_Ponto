import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class ListarAfastamentosQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  colaboradorId?: string;

  @ApiProperty({ required: false, example: '2026-08', description: 'Mês no formato YYYY-MM' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'mes deve estar no formato YYYY-MM' })
  mes?: string;
}
