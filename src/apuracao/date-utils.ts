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
