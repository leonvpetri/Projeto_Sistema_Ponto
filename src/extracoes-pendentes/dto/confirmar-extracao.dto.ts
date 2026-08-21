import { ApiProperty } from '@nestjs/swagger';
import { TipoRegistro } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsDateString, IsEnum, ValidateNested } from 'class-validator';

/** Uma batida corrigida pelo RH, no formato já usado pelo lançamento manual (ver CreateRegistroPontoDto). */
export class RegistroExtraidoDto {
  @ApiProperty()
  @IsDateString()
  dataHora: string;

  @ApiProperty({ enum: TipoRegistro })
  @IsEnum(TipoRegistro)
  tipo: TipoRegistro;
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
}
