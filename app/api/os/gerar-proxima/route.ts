import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularProximaData } from "@/lib/preventiva-utils";
import { itensPorPeriodicidade } from "@/lib/checklist-preventiva";

export async function POST(req: Request) {
  try {
    const { osId } = await req.json();

    const osAtual = await prisma.ordemServico.findUnique({
      where: { id: osId },
    });

    if (!osAtual) {
      return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
    }

    // ✅ só preventiva
    if (osAtual.tipoOS !== "PREVENTIVA") {
      return NextResponse.json(
        { error: "A OS precisa ser preventiva" },
        { status: 400 }
      );
    }

    // ✅ só concluída
    if (osAtual.status !== "CONCLUIDA") {
      return NextResponse.json(
        { error: "A OS precisa estar concluída" },
        { status: 400 }
      );
    }

    if (!osAtual.periodicidadePreventiva || !osAtual.dataProgramada) {
      return NextResponse.json(
        { error: "OS sem periodicidade ou data programada" },
        { status: 400 }
      );
    }

    // 🔥 calcula próxima data corretamente
    const proximaData = calcularProximaData(
      new Date(osAtual.dataProgramada),
      osAtual.periodicidadePreventiva
    );

    if (!proximaData) {
      return NextResponse.json(
        { error: "Periodicidade não suportada" },
        { status: 400 }
      );
    }

    // 🔥 evita duplicar (por container + periodicidade + data)
    const jaExiste = await prisma.ordemServico.findFirst({
      where: {
        tipoOS: "PREVENTIVA",
        containerId: osAtual.containerId,
        periodicidadePreventiva: osAtual.periodicidadePreventiva,
        dataProgramada: proximaData,
      },
    });

    if (jaExiste) {
      return NextResponse.json(
        { error: "Já existe uma OS nessa data" },
        { status: 400 }
      );
    }

    // 🚀 cria nova OS
    const novaOS = await prisma.ordemServico.create({
      data: {
        numero: `OS-${Date.now()}`, // ajuste se tiver lógica própria
        titulo: osAtual.titulo,
        tipoOS: "PREVENTIVA",
        periodicidadePreventiva: osAtual.periodicidadePreventiva,
        descricao: osAtual.descricao,
        motivoOS: "Gerada automaticamente",
        subsistema: osAtual.subsistema,
        containerId: osAtual.containerId,
        status: "ABERTA",
        prioridade: osAtual.prioridade,
        dataProgramada: proximaData,
        abertoPorId: osAtual.abertoPorId,
      },
    });

    // 🧠 gera checklist correto
    const itens = itensPorPeriodicidade(osAtual.periodicidadePreventiva);

    await prisma.checklistItemOS.createMany({
      data: itens.map((item) => ({
        osId: novaOS.id,
        itemId: item.id,
        descricao: item.descricao,
        periodicidade: item.periodicidade,
        subsistema: item.subsistema,
        referencia: item.referencia,
        status: "PENDENTE",
      })),
    });

    return NextResponse.json(novaOS);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}