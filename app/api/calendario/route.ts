import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

// GET /api/calendario?mes=2024-06
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mesParam = searchParams.get("mes"); // formato: YYYY-MM

  let dataRef = new Date();
  if (mesParam) {
    const [ano, mes] = mesParam.split("-").map(Number);
    dataRef = new Date(ano, mes - 1, 1);
  }

  const inicio = startOfMonth(dataRef);
  const fim = endOfMonth(dataRef);

  // OS programadas no mês
  const osProgramadas = await prisma.ordemServico.findMany({
    where: {
      dataProgramada: { gte: inicio, lte: fim },
    },
    select: {
      id: true,
      numero: true,
      titulo: true,
      tipoAtividade: true,
      prioridade: true,
      status: true,
      dataProgramada: true,
      subsistema: true,
      componenteTag: true,
      containerId: true,
      responsavel: { select: { nome: true, avatarUrl: true } },
    },
    orderBy: { dataProgramada: "asc" },
  });

  // OS com vencimento de SLA no mês (alerta)
  const osVencendoNoMes = await prisma.ordemServico.findMany({
    where: {
      dataLimiteSLA: { gte: inicio, lte: fim },
      status: { notIn: ["CONCLUIDA", "CANCELADA"] },
    },
    select: {
      id: true,
      numero: true,
      titulo: true,
      dataLimiteSLA: true,
      prioridade: true,
      tipoAtividade: true,
    },
  });

  // Agrupar OS por dia para facilitar a renderização do calendário
  const eventosPorDia: Record<string, unknown[]> = {};

  for (const os of osProgramadas) {
    if (!os.dataProgramada) continue;
    const dia = os.dataProgramada.toISOString().split("T")[0];
    if (!eventosPorDia[dia]) eventosPorDia[dia] = [];
    eventosPorDia[dia].push({ ...os, tipo: "programada" });
  }

  for (const os of osVencendoNoMes) {
    const dia = os.dataLimiteSLA.toISOString().split("T")[0];
    if (!eventosPorDia[dia]) eventosPorDia[dia] = [];
    eventosPorDia[dia].push({ ...os, tipo: "vencimento_sla" });
  }

  return NextResponse.json({
    mes: mesParam ?? dataRef.toISOString().substring(0, 7),
    eventosPorDia,
    totalProgramadas: osProgramadas.length,
    totalVencendoSLA: osVencendoNoMes.length,
  });
}