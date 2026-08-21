import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ListarRegistrosPontoQueryDto {
  @ApiProperty()
  @IsString()
  colaboradorId: string;

  @ApiProperty({ example: '2026-08-20', description: 'Dia no formato YYYY-MM-DD' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'data deve estar no formato YYYY-MM-DD' })
  data: string;
}
