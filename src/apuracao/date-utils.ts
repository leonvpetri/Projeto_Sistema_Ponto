// `new Date('YYYY-MM-DD')` é interpretado como UTC-meia-noite pelo motor de
// JS, mas `.getDay()`/`.getDate()` usam fuso horário local — em fusos atrás
// de UTC (ex.: GMT-3) isso desloca o dia da semana em 1. Esses helpers
// tratam "YYYY-MM-DD" sempre como data local, sem ambiguidade de fuso.

export function parseDataISO(dataStr: string): Date {
  const [ano, mes, dia] = dataStr.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

export function formatDataISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Os 3 fluxos que criam RegistroPonto (lançamento manual, lançamento por
// foto e confirmação da fila do WhatsApp) montam "YYYY-MM-DDTHH:mm:00" no
// front-end sem timezone. `new Date(string)` nesse formato é interpretado
// como hora LOCAL DO PROCESSO que roda o parse — em produção isso só dá
// certo por acidente, porque o `Dockerfile` fixa `ENV TZ=UTC`; rodando esse
// mesmo código em qualquer outro host (dev local, outro ambiente) sem essa
// variável, o dígito digitado pelo usuário é reinterpretado no fuso do
// host e sai deslocado (ex.: "07:58" com TZ=America/Sao_Paulo vira
// 2026-08-03T10:58:00.000Z, +3h). Este helper trata os dígitos como
// literais em UTC, sem depender do TZ do processo — mesma convenção de
// parseDataISO/formatDataISO, mas para campos com hora.
export function parseDataHoraLiteralUTC(dataHoraStr: string): Date {
  const semTimezone = dataHoraStr.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!semTimezone) return new Date(dataHoraStr);
  const [, ano, mes, dia, hora, minuto, segundo] = semTimezone;
  return new Date(
    Date.UTC(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto), Number(segundo ?? '0')),
  );
}

/** Converte "YYYY-MM" no intervalo [primeiro dia, primeiro dia do mês seguinte). */
export function periodoDoMes(mes: string): { inicio: Date; fim: Date } {
  const [ano, mesNum] = mes.split('-').map(Number);
  const inicio = new Date(ano, mesNum - 1, 1);
  const fim = new Date(ano, mesNum, 1);
  return { inicio, fim };
}
