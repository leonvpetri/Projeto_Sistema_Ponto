import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejeitarExtracaoDto {
  @ApiProperty({ example: 'Foto ilegível' })
  @IsString()
  @MinLength(1)
  motivoRejeicao: string;
}
