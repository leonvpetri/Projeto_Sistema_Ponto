import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ConsultarApuracaoDto {
  @ApiProperty()
  @IsString()
  colaboradorId: string;

  @ApiProperty({ example: '2026-08', description: 'Mês no formato YYYY-MM' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'mes deve estar no formato YYYY-MM' })
  mes: string;
}
