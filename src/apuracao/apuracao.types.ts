import { TipoEscala } from '@prisma/client';

export interface JornadaCalc {
  tipo: TipoEscala;
  cargaDiariaEsperadaMin?: number | null;
  duracaoIntervaloMin?: number | null;
  toleranciaIntervaloMin?: number | null;
  toleranciaBancoHorasMin: number;
  temAdicionalNoturno: boolean;
  horarioNoturnoInicio: string;
  horarioNoturnoFim: string;
  horaNoturnaReduzida: boolean;
}

export interface ColaboradorCalc {
  id: string;
  dataBaseEscala12x36: Date | null;
}

export interface RegistroCalc {
  dataHora: Date;
}

export interface TrocaCalc {
  colaboradorOriginalId: string;
  colaboradorSubstitutoId: string;
}

export interface IntervaloCalc {
  entrada: Date;
  saida: Date;
  min: number;
}

export type StatusApuracao = 'OK' | 'ATRASO' | 'HORA_EXTRA' | 'FALTA' | 'FOLGA' | 'INCONSISTENTE';

export interface ApuracaoResultado {
  colaboradorId: string;
  data: string;
  diaEsperadoTrabalho: boolean;
  totalTrabalhadoMin: number | null;
  totalNoturnoMin: number | null;
  totalNoturnoEquivalenteMin: number | null;
  cargaEsperadaMin: number;
  diferencaBancoHorasMin: number | null;
  status: StatusApuracao;
  alertas: string[];
}
