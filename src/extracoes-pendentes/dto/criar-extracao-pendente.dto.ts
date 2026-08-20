import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CriarExtracaoPendenteDto {
  @ApiProperty({ example: '5534999999999', description: 'Telefone (WhatsApp) de quem enviou a foto' })
  @IsString()
  telefoneOrigem: string;

  @ApiProperty({ example: 'https://...' })
  @IsString()
  fotoUrl: string;

  @ApiProperty({ required: false, example: 'Márcia Ferreira da Cunha' })
  @IsOptional()
  @IsString()
  nomeExtraidoCartao?: string;

  @ApiProperty({ required: false, example: '042.329.836-43' })
  @IsOptional()
  @IsString()
  cpfExtraidoCartao?: string;

  @ApiProperty({ description: 'JSON bruto (stringificado) com os dias/horários extraídos da foto' })
  @IsString()
  dadosExtraidosJson: string;
}
