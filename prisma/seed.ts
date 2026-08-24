import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const senhaHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@empresa.com' },
    update: {},
    create: {
      email: 'admin@empresa.com',
      nome: 'Administrador',
      senhaHash,
      role: Role.ADMIN,
    },
  });

  const administrativoPadrao = await prisma.jornada.upsert({
    where: { id: 'jornada-administrativo-padrao' },
    update: {},
    create: {
      id: 'jornada-administrativo-padrao',
      nome: 'Administrativo Padrão',
      tipo: 'PADRAO_5X2',
      horaEntradaPadrao: '07:30',
      horaSaidaPadrao: '16:30',
      duracaoIntervaloMin: 90,
      toleranciaIntervaloMin: 10,
      cargaDiariaEsperadaMin: 7 * 60 + 30, // 9h de janela - 1h30 intervalo
      toleranciaBancoHorasMin: 10,
    },
  });

  const comercialCompensadoSabado = await prisma.jornada.upsert({
    where: { id: 'jornada-comercial-compensado-sabado' },
    update: {},
    create: {
      id: 'jornada-comercial-compensado-sabado',
      nome: 'Comercial Compensado Sábado',
      tipo: 'PADRAO_5X2',
      horaEntradaPadrao: '08:00',
      horaSaidaPadrao: '18:00',
      duracaoIntervaloMin: 90,
      toleranciaIntervaloMin: 10,
      cargaDiariaEsperadaMin: 8 * 60 + 30, // 10h de janela - 1h30 intervalo
      toleranciaBancoHorasMin: 10,
    },
  });

  const escala12x36Noturno = await prisma.jornada.upsert({
    where: { id: 'jornada-12x36-noturno' },
    update: {},
    create: {
      id: 'jornada-12x36-noturno',
      nome: 'Escala 12x36 Noturno (Portaria/Vigilância)',
      tipo: 'ESCALA_12X36',
      horaEntradaPadrao: '19:00',
      horaSaidaPadrao: '08:00', // vira o dia — turno de 13h de janela, 1h de intervalo, 12h líquidas
      duracaoIntervaloMin: 60,
      toleranciaIntervaloMin: 10,
      cargaDiariaEsperadaMin: 12 * 60, // 13h de janela - 1h intervalo
      toleranciaBancoHorasMin: 10,
      temAdicionalNoturno: true,
      horarioNoturnoInicio: '22:00',
      horarioNoturnoFim: '05:00',
      percentualAdicionalNoturno: 0.2,
      horaNoturnaReduzida: true,
    },
  });

  console.log('Seed concluído:', {
    administrativoPadrao: administrativoPadrao.nome,
    comercialCompensadoSabado: comercialCompensadoSabado.nome,
    escala12x36Noturno: escala12x36Noturno.nome,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
