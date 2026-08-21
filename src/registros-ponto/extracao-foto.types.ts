export interface DiaExtraidoFoto {
  dia: string; // número do dia como aparece no cartão, ex.: "1", "21"
  entrada1: string | null; // "HH:MM"
  saida1: string | null;
  entrada2: string | null;
  saida2: string | null;
  observacao: string | null;
}

export interface ExtracaoFotoResultado {
  nome: string | null;
  cpf: string | null;
  mesReferencia: string | null; // "YYYY-MM"
  dias: DiaExtraidoFoto[];
}
