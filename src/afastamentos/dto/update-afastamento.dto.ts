import { PartialType } from '@nestjs/swagger';
import { CreateAfastamentoDto } from './create-afastamento.dto';

export class UpdateAfastamentoDto extends PartialType(CreateAfastamentoDto) {}
