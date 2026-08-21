import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { ExtracaoFotoResultado } from './extracao-foto.types';

const PROMPT = `Esta imagem é um cartão de ponto mecânico (impresso por relógio de ponto), com o cabeçalho contendo nome do colaborador, CPF, mês/ano de referência e setor, seguido de uma tabela com uma linha por dia do mês (colunas: Dia | Entrada | Saída | Entrada | Saída), cobrindo o mês inteiro (1ª e 2ª quinzena). Observações manuscritas (ex.: "Médico", "Compras Firma") podem aparecer ao lado de algum dia.

Extraia os dados e responda ESTRITAMENTE em JSON, sem nenhum texto antes ou depois, no formato:
{
  "nome": string ou null,
  "cpf": string ou null,
  "mesReferencia": "YYYY-MM" ou null,
  "dias": [
    { "dia": "1", "entrada1": "08:00" ou null, "saida1": "12:00" ou null, "entrada2": "13:00" ou null, "saida2": "17:00" ou null, "observacao": string ou null }
  ]
}

Regras:
- Um objeto em "dias" para cada dia visível na imagem, mesmo que todos os horários estejam vazios.
- Horários sempre no formato "HH:MM" (24h) ou null se ilegível/vazio.
- "dia" é só o número do dia (sem mês/ano), como uma string.
- Se não conseguir ler algum campo com confiança, use null em vez de adivinhar.`;

@Injectable()
export class ExtracaoFotoService {
  async extrair(buffer: Buffer, mimetype: string): Promise<ExtracaoFotoResultado> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ServiceUnavailableException(
        'Extração automática por foto requer ANTHROPIC_API_KEY configurada no servidor.',
      );
    }

    const client = new Anthropic();

    let response;
    try {
      response = await client.messages.create({
        model: 'claude-opus-5',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimetype as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: buffer.toString('base64'),
                },
              },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      });
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        throw new ServiceUnavailableException('ANTHROPIC_API_KEY inválida.');
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new BadGatewayException('Limite de requisições da API de extração atingido, tente novamente em instantes.');
      }
      if (error instanceof Anthropic.APIError) {
        throw new BadGatewayException(`Erro na API de extração: ${error.message}`);
      }
      throw error;
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock) {
      throw new BadGatewayException('A extração não retornou texto.');
    }

    const jsonTexto = textBlock.text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '');

    try {
      return JSON.parse(jsonTexto) as ExtracaoFotoResultado;
    } catch {
      throw new BadGatewayException(
        'Não foi possível interpretar a resposta da extração — tente novamente ou lance manualmente.',
      );
    }
  }
}
