import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateTrocaEscalaDto {
  @ApiProperty()
  @IsDateString()
  data: string;

  @ApiProperty()
  @IsString()
  colaboradorOriginalId: string;

  @ApiProperty()
  @IsString()
  colaboradorSubstitutoId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  motivo?: string;

  @ApiProperty()
  @IsString()
  supervisorInformado: string;

  @ApiProperty()
  @IsString()
  registradoPor: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  confirmadoPeloRH?: boolean;
}
