// ============================================================
// MOTOR DE APURAÇÃO DE PONTO
// Lógica pura (sem DB, sem framework) — pensada pra virar um
// service do NestJS depois, recebendo os mesmos dados que viriam
// do Prisma (Colaborador, Jornada, RegistroPonto[], TrocaEscala[]).
// ============================================================

const MS_MIN = 60 * 1000;

function diffMin(a, b) {
  return Math.round((b.getTime() - a.getTime()) / MS_MIN);
}

// ------------------------------------------------------------
// 1) Determina se o dia é "esperado de trabalho" pro colaborador,
//    já considerando TrocaEscala. Retorna também quem é o
//    "responsável efetivo" do dia (pode ter mudado por troca).
// ------------------------------------------------------------
function diaEsperadoTrabalho(colaborador, jornada, data, trocasDoDia) {
  // troca tem prioridade sobre a regra padrão
  const trocaComoSubstituto = trocasDoDia.find(
    (t) => t.colaboradorSubstitutoId === colaborador.id
  );
  const trocaComoOriginal = trocasDoDia.find(
    (t) => t.colaboradorOriginalId === colaborador.id
  );

  if (trocaComoSubstituto) {
    return { esperado: true, motivo: `Substituindo ${trocaComoSubstituto.colaboradorOriginalId} (troca de escala)` };
  }
  if (trocaComoOriginal) {
    return { esperado: false, motivo: `Substituído por ${trocaComoOriginal.colaboradorSubstitutoId} (troca de escala)` };
  }

  if (jornada.tipo === "PADRAO_5X2" || jornada.tipo === "COMPENSADO_SABADO") {
    const diaSemana = data.getDay(); // 0=domingo, 6=sábado
    return { esperado: diaSemana >= 1 && diaSemana <= 5, motivo: null };
  }

  if (jornada.tipo === "ESCALA_12X36") {
    const base = new Date(colaborador.dataBaseEscala12x36);
    const diffDias = Math.floor((data - base) / (1000 * 60 * 60 * 24));
    return { esperado: diffDias % 2 === 0, motivo: null };
  }

  return { esperado: true, motivo: null };
}

// ------------------------------------------------------------
// 2) Soma o total trabalhado, pareando batidas consecutivas
//    (entrada,saida,entrada,saida...) — funciona pra qualquer
//    número de pares, tanto 5x2 (2 pares) quanto 12x36 (1 par).
// ------------------------------------------------------------
function calcularTotalTrabalhadoMin(registrosDoDia) {
  const ordenados = [...registrosDoDia].sort((a, b) => a.dataHora - b.dataHora);
  let totalMin = 0;
  const intervalos = [];

  for (let i = 0; i + 1 < ordenados.length; i += 2) {
    const entrada = ordenados[i].dataHora;
    const saida = ordenados[i + 1].dataHora;
    const min = diffMin(entrada, saida);
    totalMin += min;
    intervalos.push({ entrada, saida, min });
  }

  const batidaImpar = ordenados.length % 2 !== 0;
  return { totalMin, intervalos, batidaImpar, ultimaBatida: ordenados[ordenados.length - 1] };
}

// ------------------------------------------------------------
// 3) Minutos trabalhados dentro da janela noturna (22h-5h por
//    padrão), lidando com virada de dia. Depois converte pela
//    hora reduzida (CLT Art. 73: 52min30s = 1h), se aplicável.
// ------------------------------------------------------------
function calcularMinutosNoturnos(intervalos, jornada) {
  if (!jornada.temAdicionalNoturno) return { relogioMin: 0, equivalenteMin: 0 };

  const [hIni, mIni] = jornada.horarioNoturnoInicio.split(":").map(Number);
  const [hFim, mFim] = jornada.horarioNoturnoFim.split(":").map(Number);

  let relogioMin = 0;
  for (const { entrada, saida } of intervalos) {
    // gera janelas noturnas candidatas cobrindo o período do intervalo
    const diaInicial = new Date(entrada);
    diaInicial.setHours(0, 0, 0, 0);
    for (let offset = -1; offset <= 1; offset++) {
      const janelaInicio = new Date(diaInicial);
      janelaInicio.setDate(janelaInicio.getDate() + offset);
      janelaInicio.setHours(hIni, mIni, 0, 0);

      const janelaFim = new Date(janelaInicio);
      janelaFim.setDate(janelaFim.getDate() + (hFim <= hIni ? 1 : 0));
      janelaFim.setHours(hFim, mFim, 0, 0);

      const overlapStart = new Date(Math.max(entrada, janelaInicio));
      const overlapEnd = new Date(Math.min(saida, janelaFim));
      if (overlapEnd > overlapStart) {
        relogioMin += diffMin(overlapStart, overlapEnd);
      }
    }
  }

  const equivalenteMin = jornada.horaNoturnaReduzida
    ? Math.round(relogioMin * (60 / 52.5))
    : relogioMin;

  return { relogioMin, equivalenteMin };
}

// ------------------------------------------------------------
// 4) Valida o intervalo (só relevante pra COMPENSADO_SABADO, onde
//    o horário varia mas a DURAÇÃO tem que ser fixa)
// ------------------------------------------------------------
function validarIntervalo(intervalos, jornada, alertas) {
  if (!jornada.duracaoIntervaloMin || intervalos.length < 2) return;

  // intervalo = tempo ENTRE o 1º par e o 2º par (saída1 -> entrada2)
  const saida1 = intervalos[0].saida;
  const entrada2 = intervalos[1].entrada;
  const duracaoReal = diffMin(saida1, entrada2);
  const tolerancia = jornada.toleranciaIntervaloMin ?? 10;

  if (Math.abs(duracaoReal - jornada.duracaoIntervaloMin) > tolerancia) {
    alertas.push(
      `Intervalo de ${duracaoReal}min, fora do padrão de ${jornada.duracaoIntervaloMin}min (tolerância ${tolerancia}min)`
    );
  }
}

// ------------------------------------------------------------
// 5) Função principal — calcula a ApuracaoDiaria de um colaborador
//    num dia específico.
// ------------------------------------------------------------
function calcularApuracaoDia({ colaborador, jornada, data, registrosDoDia, trocasDoDia }) {
  const alertas = [];

  const { esperado, motivo } = diaEsperadoTrabalho(colaborador, jornada, data, trocasDoDia);
  const { totalMin, intervalos, batidaImpar } = calcularTotalTrabalhadoMin(registrosDoDia);
  const { relogioMin: noturnoRelogioMin, equivalenteMin: noturnoEquivalenteMin } =
    calcularMinutosNoturnos(intervalos, jornada);

  if (batidaImpar) {
    alertas.push("Número ímpar de batidas no dia — falta uma marcação (entrada ou saída)");
  }

  validarIntervalo(intervalos, jornada, alertas);

  const cargaEsperadaMin = jornada.tipo === "ESCALA_12X36"
    ? jornada.cargaTurno12x36Min
    : jornada.cargaDiariaEsperadaMin;

  let status;
  const diferencaMin = totalMin - (esperado ? cargaEsperadaMin : 0);

  if (registrosDoDia.length === 0 && !esperado) {
    status = "FOLGA";
  } else if (registrosDoDia.length === 0 && esperado) {
    status = "FALTA";
  } else if (!esperado && registrosDoDia.length > 0) {
    status = "INCONSISTENTE";
    alertas.push(`Trabalhou em dia de folga (${motivo ?? "sem troca de escala registrada"}) — verificar troca de escala`);
  } else if (batidaImpar) {
    status = "INCONSISTENTE";
  } else {
    const tolerancia = jornada.toleranciaBancoHorasMin ?? 10;
    if (Math.abs(diferencaMin) <= tolerancia) status = "OK";
    else if (diferencaMin > 0) status = "HORA_EXTRA";
    else status = "ATRASO";
  }

  return {
    colaboradorId: colaborador.id,
    data: data.toISOString().slice(0, 10),
    diaEsperadoTrabalho: esperado,
    totalTrabalhadoMin: registrosDoDia.length ? totalMin : null,
    totalNoturnoMin: noturnoRelogioMin || null,
    totalNoturnoEquivalenteMin: noturnoEquivalenteMin || null,
    cargaEsperadaMin,
    diferencaBancoHorasMin: registrosDoDia.length ? diferencaMin : null,
    status,
    alertas,
  };
}

module.exports = { calcularApuracaoDia, diaEsperadoTrabalho, calcularTotalTrabalhadoMin, calcularMinutosNoturnos };
