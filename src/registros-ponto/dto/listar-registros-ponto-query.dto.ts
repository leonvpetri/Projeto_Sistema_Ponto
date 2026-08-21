import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class ListarRegistrosPontoQueryDto {
  @ApiProperty()
  @IsString()
  colaboradorId: string;

  @ApiProperty({
    required: false,
    example: '2026-08-20',
    description: 'Dia no formato YYYY-MM-DD — use este OU mes, não os dois',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'data deve estar no formato YYYY-MM-DD' })
  data?: string;

  @ApiProperty({
    required: false,
    example: '2026-08',
    description: 'Mês no formato YYYY-MM — use este OU data, não os dois',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'mes deve estar no formato YYYY-MM' })
  mes?: string;
}
