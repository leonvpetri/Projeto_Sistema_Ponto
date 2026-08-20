const { calcularApuracaoDia } = require("./engine");

function dt(dataStr, horaStr) {
  return new Date(`${dataStr}T${horaStr}:00`);
}
function reg(dataHora) {
  return { dataHora };
}

console.log("=".repeat(70));
console.log("CENÁRIO 1 — Márcia (PADRAO_5X2) — dados reais do cartão, dia 6");
console.log("Bateu 08:24 (atrasada) mas compensou saindo mais tarde à noite");
console.log("=".repeat(70));

const jornadaMarcia = {
  tipo: "PADRAO_5X2",
  cargaDiariaEsperadaMin: 8 * 60,
  toleranciaBancoHorasMin: 10,
  temAdicionalNoturno: false,
};
const marcia = { id: "marcia", dataBaseEscala12x36: null };

const registrosDia6 = [
  reg(dt("2026-08-06", "08:24")),
  reg(dt("2026-08-06", "12:07")),
  reg(dt("2026-08-06", "13:41")),
  reg(dt("2026-08-06", "17:27")),
];

console.log(
  JSON.stringify(
    calcularApuracaoDia({
      colaborador: marcia,
      jornada: jornadaMarcia,
      data: new Date("2026-08-06"),
      registrosDoDia: registrosDia6,
      trocasDoDia: [],
    }),
    null,
    2
  )
);

console.log("\n" + "=".repeat(70));
console.log("CENÁRIO 2 — Comercial (COMPENSADO_SABADO) — intervalo variável");
console.log("Almoço começou 11:45, voltou 13:20 → 95min (esperado 90min ±10)");
console.log("=".repeat(70));

const jornadaComercial = {
  tipo: "COMPENSADO_SABADO",
  cargaDiariaEsperadaMin: 8 * 60 + 30, // 8h30 (10h janela - 1h30 intervalo)
  duracaoIntervaloMin: 90,
  toleranciaIntervaloMin: 10,
  toleranciaBancoHorasMin: 10,
  temAdicionalNoturno: false,
};
const comercial = { id: "joao", dataBaseEscala12x36: null };

const registrosComercial = [
  reg(dt("2026-08-10", "08:00")),
  reg(dt("2026-08-10", "11:45")),
  reg(dt("2026-08-10", "13:20")),
  reg(dt("2026-08-10", "18:05")),
];

console.log(
  JSON.stringify(
    calcularApuracaoDia({
      colaborador: comercial,
      jornada: jornadaComercial,
      data: new Date("2026-08-10"),
      registrosDoDia: registrosComercial,
      trocasDoDia: [],
    }),
    null,
    2
  )
);

console.log("\n" + "=".repeat(70));
console.log("CENÁRIO 3 — Porteiro (ESCALA_12X36 noturno) — 19:00 às 07:00");
console.log("Testa adicional noturno com hora reduzida (CLT Art. 73)");
console.log("=".repeat(70));

const jornada12x36Noturno = {
  tipo: "ESCALA_12X36",
  cargaTurno12x36Min: 12 * 60,
  toleranciaBancoHorasMin: 10,
  temAdicionalNoturno: true,
  horarioNoturnoInicio: "22:00",
  horarioNoturnoFim: "05:00",
  percentualAdicionalNoturno: 0.2,
  horaNoturnaReduzida: true,
};
const porteiro = { id: "porteiro-1", dataBaseEscala12x36: new Date("2026-08-01") };

const registrosPorteiro = [
  reg(dt("2026-08-03", "19:00")),
  reg(dt("2026-08-04", "07:00")), // vira o dia — turno de 12h
];

console.log(
  JSON.stringify(
    calcularApuracaoDia({
      colaborador: porteiro,
      jornada: jornada12x36Noturno,
      data: new Date("2026-08-03"),
      registrosDoDia: registrosPorteiro,
      trocasDoDia: [],
    }),
    null,
    2
  )
);

console.log("\n" + "=".repeat(70));
console.log("CENÁRIO 4 — Troca de escala NÃO registrada ainda");
console.log("Colaborador do dia (Pedro) cobriu o turno do porteiro na folga dele");
console.log("=".repeat(70));

const pedro = { id: "pedro", dataBaseEscala12x36: null };
const jornadaPedro = { ...jornadaMarcia }; // Pedro é 5x2, mas cobriu um turno 12x36

console.log("SEM troca de escala registrada:");
console.log(
  JSON.stringify(
    calcularApuracaoDia({
      colaborador: pedro,
      jornada: jornadaPedro,
      data: new Date("2026-08-08"), // sábado — Pedro não deveria trabalhar
      registrosDoDia: [reg(dt("2026-08-08", "08:00")), reg(dt("2026-08-08", "16:00"))],
      trocasDoDia: [],
    }),
    null,
    2
  )
);

console.log("\nCOM troca de escala registrada (RH lançou no fechamento):");
const trocaExemplo = {
  colaboradorOriginalId: "porteiro-1",
  colaboradorSubstitutoId: "pedro",
};
console.log(
  JSON.stringify(
    calcularApuracaoDia({
      colaborador: pedro,
      jornada: jornadaPedro,
      data: new Date("2026-08-08"),
      registrosDoDia: [reg(dt("2026-08-08", "08:00")), reg(dt("2026-08-08", "16:00"))],
      trocasDoDia: [trocaExemplo],
    }),
    null,
    2
  )
);
