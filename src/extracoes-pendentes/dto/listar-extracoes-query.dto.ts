import { ApiProperty } from '@nestjs/swagger';
import { StatusExtracao } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListarExtracoesQueryDto {
  @ApiProperty({ enum: StatusExtracao, required: false, description: 'Sem filtro, lista todas' })
  @IsOptional()
  @IsEnum(StatusExtracao)
  status?: StatusExtracao;
}
