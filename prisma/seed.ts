import {  } from "@prisma/client";
import { addMonths, subMonths, addDays } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // Usuário admin de exemplo (precisa ter clerkId real)
  const admin = await prisma.usuario.upsert({
    where: { email: "admin@radius.com" },
    update: {},
    create: {
      clerkId: "clerk_seed_admin",
      nome: "Admin Radius",
      email: "admin@radius.com",
      cargo: "ADMIN",
    },
  });

  const tecnico = await prisma.usuario.upsert({
    where: { email: "tecnico@radius.com" },
    update: {},
    create: {
      clerkId: "clerk_seed_tecnico",
      nome: "João Técnico",
      email: "tecnico@radius.com",
      cargo: "TECNICO",
    },
  });

  // OS de exemplo
  const osExemplos = [
    {
      numero: "OS-2024-0001",
      titulo: "Troca de rolamento — Bomba centrífuga #3",
      descricao: "Substituição dos rolamentos desgastados da bomba centrífuga número 3 do setor A.",
      motivoOS: "Vibração excessiva detectada em inspeção preditiva. Rolamento com folga > 0.1mm.",
      tipoManutencao: "CORRETIVA" as const,
      prioridade: "ALTA" as const,
      status: "EM_ANDAMENTO" as const,
      dataEmissaoAxia: subMonths(new Date(), 6),
      localAtivo: "Bomba centrífuga #3 — Setor A",
      tag: "BBA-003",
      dataProgramada: addDays(new Date(), 3),
      abertoPorId: admin.id,
      responsavelId: tecnico.id,
    },
    {
      numero: "OS-2024-0002",
      titulo: "Inspeção preventiva — Sistema elétrico Subestação 1",
      descricao: "Inspeção e limpeza geral do painel elétrico da subestação 1.",
      motivoOS: "Manutenção preventiva conforme plano anual.",
      tipoManutencao: "PREVENTIVA" as const,
      prioridade: "MEDIA" as const,
      status: "ABERTA" as const,
      dataEmissaoAxia: subMonths(new Date(), 2),
      localAtivo: "Subestação 1 — Área Industrial",
      tag: "SUB-001",
      dataProgramada: addDays(new Date(), 7),
      abertoPorId: admin.id,
      responsavelId: tecnico.id,
    },
    {
      numero: "OS-2024-0003",
      titulo: "Reparo emergencial — Vazamento tubulação principal",
      descricao: "Reparo de vazamento identificado na tubulação de 6 polegadas do setor B.",
      motivoOS: "Vazamento ativo com perda estimada de 50L/min. Risco de contaminação.",
      tipoManutencao: "EMERGENCIAL" as const,
      prioridade: "CRITICA" as const,
      status: "ABERTA" as const,
      dataEmissaoAxia: subMonths(new Date(), 1),
      localAtivo: "Tubulação principal — Setor B",
      tag: "TUB-B-06",
      abertoPorId: admin.id,
    },
  ];

  for (const os of osExemplos) {
    const dataLimite = addMonths(os.dataEmissaoAxia, 24);
    await prisma.ordemServico.upsert({
      where: { numero: os.numero },
      update: {},
      create: { ...os, dataLimite },
    });
  }

  console.log("✅ Seed concluído!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
