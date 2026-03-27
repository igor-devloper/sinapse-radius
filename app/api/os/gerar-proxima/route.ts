import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularProximaData } from "@/lib/preventiva-utils";
import { itensPorMultiplasPeriodicidades } from "@/lib/checklist-preventiva";
import { gerarNumeroOS } from "@/lib/sla-manual";

export async function POST(req: Request) {
  try {
    const { osId } = await req.json();

    const osAtual = await prisma.ordemServico.findUnique({
      where: { id: osId },
    });

    if (!osAtual) {
      return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
    }

    if (osAtual.tipoOS !== "PREVENTIVA") {
      return NextResponse.json({ error: "A OS precisa ser preventiva" }, { status: 400 });
    }

    if (osAtual.status !== "CONCLUIDA") {
      return NextResponse.json({ error: "A OS precisa estar concluída" }, { status: 400 });
    }

    if (!osAtual.dataProgramada) {
      return NextResponse.json({ error: "OS sem data programada" }, { status: 400 });
    }

    // Resolve periodicidades: novo modelo ou legado
    const periodicidades: string[] =
      (osAtual.periodicidadesSelecionadas && osAtual.periodicidadesSelecionadas.length > 0)
        ? osAtual.periodicidadesSelecionadas
        : osAtual.periodicidadePreventiva
          ? [osAtual.periodicidadePreventiva]
          : [];

    if (periodicidades.length === 0) {
      return NextResponse.json({ error: "OS sem periodicidade definida" }, { status: 400 });
    }

    // Calcula próxima data baseada na periodicidade principal (a de menor frequência)
    const periodicidadePrincipal = periodicidades[0];
    const proximaData = calcularProximaData(
      new Date(osAtual.dataProgramada),
      periodicidadePrincipal as never
    );

    if (!proximaData) {
      return NextResponse.json({ error: "Periodicidade não suportada" }, { status: 400 });
    }

    // Evita duplicata (por container + periodicidades + data)
    const jaExiste = await prisma.ordemServico.findFirst({
      where: {
        tipoOS: "PREVENTIVA",
        containerId: osAtual.containerId,
        dataProgramada: proximaData,
        // Verifica sobreposição de periodicidades usando array GIN
        periodicidadesSelecionadas: { hasSome: periodicidades },
      },
    });

    if (jaExiste) {
      return NextResponse.json({ error: "Já existe uma OS para essas periodicidades nessa data" }, { status: 400 });
    }

    const count = await prisma.ordemServico.count();
    const numero = gerarNumeroOS(count + 1);

    // Cria nova OS com as mesmas periodicidades
    const novaOS = await prisma.$transaction(async (tx) => {
      const os = await tx.ordemServico.create({
        data: {
          numero,
          titulo: osAtual.titulo,
          tipoOS: "PREVENTIVA",
          periodicidadesSelecionadas: periodicidades,
          periodicidadePreventiva: osAtual.periodicidadePreventiva, // legado
          descricao: osAtual.descricao,
          motivoOS: "Gerada automaticamente a partir da OS anterior.",
          subsistema: osAtual.subsistema,
          containerId: osAtual.containerId,
          status: "ABERTA",
          prioridade: osAtual.prioridade,
          dataProgramada: proximaData,
          responsavelId: osAtual.responsavelId,
          abertoPorId: osAtual.abertoPorId,
        },
      });

      // Gera checklist unificado de todas as periodicidades
      const itens = itensPorMultiplasPeriodicidades(periodicidades);
      if (itens.length > 0) {
        await tx.checklistItemOS.createMany({
          data: itens.map((item) => ({
            osId: os.id,
            itemId: item.id,
            descricao: item.descricao,
            periodicidade: item.periodicidade,
            subsistema: item.subsistema,
            referencia: item.referencia,
            status: "PENDENTE",
          })),
        });
      }

      await tx.historicoOS.create({
        data: {
          osId: os.id,
          statusPara: "ABERTA",
          observacao: `OS gerada automaticamente a partir de ${osAtual.numero}`,
          usuarioId: osAtual.abertoPorId,
        },
      });

      return os;
    });

    return NextResponse.json(novaOS);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}