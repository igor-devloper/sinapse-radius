import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularSLA } from "@/lib/sla-manual";
import { subDays } from "date-fns";

// GET /api/dashboard — Métricas para a home
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const agora = new Date();
  const ha30dias = subDays(agora, 30);

  const [
    totalOS,
    osAbertas,
    osEmAndamento,
    osConcluidas,
    osCanceladas,
    osCriticas,
    osUltimos30dias,
    osVencendoEm30dias,
    todasOSComData,
  ] = await Promise.all([
    prisma.ordemServico.count(),
    prisma.ordemServico.count({ where: { status: "ABERTA" } }),
    prisma.ordemServico.count({ where: { status: "EM_ANDAMENTO" } }),
    prisma.ordemServico.count({ where: { status: "CONCLUIDA" } }),
    prisma.ordemServico.count({ where: { status: "CANCELADA" } }),
    prisma.ordemServico.count({ where: { prioridade: "CRITICA", status: { notIn: ["CONCLUIDA", "CANCELADA"] } } }),
    prisma.ordemServico.count({ where: { createdAt: { gte: ha30dias } } }),
    // OS corretivas que vencem nos próximos 30 dias
    prisma.ordemServico.count({
      where: {
        tipoOS: "CORRETIVA",
        dataLimiteSLA: { gte: agora, lte: subDays(agora, -30) },
        status: { notIn: ["CONCLUIDA", "CANCELADA"] },
      },
    }),
    // Para calcular quantas estão com SLA vencido (apenas corretivas)
    prisma.ordemServico.findMany({
      where: {
        tipoOS: "CORRETIVA",
        status: { notIn: ["CONCLUIDA", "CANCELADA"] },
        dataEmissaoAxia: { not: null },
        tipoAtividadeCorretiva: { not: null },
      },
      select: { id: true, dataEmissaoAxia: true, tipoAtividadeCorretiva: true },
    }),
  ]);

  const osSLAVencido = todasOSComData.filter(
    (os) =>
      os.dataEmissaoAxia &&
      os.tipoAtividadeCorretiva &&
      calcularSLA(os.dataEmissaoAxia, os.tipoAtividadeCorretiva).vencido
  ).length;

  // OS por tipoOS
  const porTipo = await prisma.ordemServico.groupBy({
    by: ["tipoOS"],
    _count: { id: true },
  });

  // OS por status
  const porStatus = await prisma.ordemServico.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  // Últimas 5 OS abertas
  const ultimasOS = await prisma.ordemServico.findMany({
    where: { status: { notIn: ["CONCLUIDA", "CANCELADA"] } },
    include: {
      responsavel: { select: { nome: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // OS próximas (dataProgramada nos próximos 7 dias)
  const osProximas = await prisma.ordemServico.findMany({
    where: {
      dataProgramada: { gte: agora, lte: subDays(agora, -7) },
      status: { notIn: ["CONCLUIDA", "CANCELADA"] },
    },
    include: {
      responsavel: { select: { nome: true, avatarUrl: true } },
    },
    orderBy: { dataProgramada: "asc" },
    take: 5,
  });

  return NextResponse.json({
    cards: {
      totalOS,
      osAbertas,
      osEmAndamento,
      osConcluidas,
      osCanceladas,
      osCriticas,
      osUltimos30dias,
      osVencendoEm30dias,
      osSLAVencido,
    },
    porTipo,
    porStatus,
    ultimasOS: ultimasOS.map((os) => ({
      ...os,
      sla:
        os.tipoOS === "CORRETIVA" && os.dataEmissaoAxia && os.tipoAtividadeCorretiva
          ? calcularSLA(os.dataEmissaoAxia, os.tipoAtividadeCorretiva)
          : null,
    })),
    osProximas: osProximas.map((os) => ({
      ...os,
      sla:
        os.tipoOS === "CORRETIVA" && os.dataEmissaoAxia && os.tipoAtividadeCorretiva
          ? calcularSLA(os.dataEmissaoAxia, os.tipoAtividadeCorretiva)
          : null,
    })),
  });
}