import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularSLA } from "@/lib/sla-manual";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const osId = (await params).id;

  const os = await prisma.ordemServico.findUnique({
    where: { id: osId },
    include: {
      responsavel: { select: { nome: true, email: true, cargo: true } },
      abertoPor:   { select: { nome: true, email: true } },
      comentarios: {
        include: { usuario: { select: { nome: true } } },
        orderBy: { createdAt: "asc" },
      },
      historicoOS: {
        include: { usuario: { select: { nome: true } } },
        orderBy: { createdAt: "asc" },
      },
      anexos:        { orderBy: { createdAt: "asc" } },
      checklistItems: { orderBy: [{ subsistema: "asc" }, { itemId: "asc" }] },
    },
  });

  if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });

  // Só gera relatório se concluída
  if (os.status !== "CONCLUIDA") {
    return NextResponse.json(
      { error: "Relatório disponível apenas para OS com status CONCLUIDA" },
      { status: 400 }
    );
  }

  const sla = calcularSLA(os.dataEmissaoAxia, os.tipoAtividade);

  const payload = {
    id: os.id,
    numero: os.numero,
    titulo: os.titulo,
    descricao: os.descricao,
    motivoOS: os.motivoOS,
    tipoAtividade: os.tipoAtividade,
    status: os.status,
    prioridade: os.prioridade,
    subsistema: os.subsistema,
    componenteTag: os.componenteTag,
    containerId: os.containerId,
    // SLA
    dataEmissaoAxia: os.dataEmissaoAxia.toISOString(),
    dataLimiteSLA: os.dataLimiteSLA.toISOString(),
    prazoSLAHoras: os.prazoSLAHoras,
    slaVencido: os.slaVencido,
    sla: {
      statusLabel: sla.statusLabel,
      statusColor: sla.statusColor,
      tempoFormatado: sla.tempoFormatado,
      percentualDecorrido: sla.percentualDecorrido,
      referenciaManual: sla.referenciaManual,
      isCorretiva: sla.isCorretiva,
      atuacaoHoras: sla.atuacaoHoras,
      dataLimiteAtuacao: sla.dataLimiteAtuacao?.toISOString() ?? null,
    },
    // Datas
    dataProgramada: os.dataProgramada?.toISOString() ?? null,
    dataInicio: os.dataInicio?.toISOString() ?? null,
    dataConclusao: os.dataConclusao?.toISOString() ?? null,
    createdAt: os.createdAt.toISOString(),
    // Equipe
    responsavel: os.responsavel,
    abertoPor: os.abertoPor,
    // Checklist
    checklistItems: os.checklistItems.map((item) => ({
      id: item.id,
      itemId: item.itemId,
      descricao: item.descricao,
      periodicidade: item.periodicidade,
      subsistema: item.subsistema,
      referencia: item.referencia,
      status: item.status,
      observacao: item.observacao,
      atualizadoEm: item.atualizadoEm?.toISOString() ?? null,
    })),
    // Comentários
    comentarios: os.comentarios.map((c) => ({
      texto: c.texto,
      usuario: c.usuario.nome,
      createdAt: c.createdAt.toISOString(),
    })),
    // Histórico
    historico: os.historicoOS.map((h) => ({
      statusDe: h.statusDe,
      statusPara: h.statusPara,
      observacao: h.observacao,
      usuario: h.usuario.nome,
      createdAt: h.createdAt.toISOString(),
    })),
    // Anexos — URLs serão resolvidas no client via /api/files/anexo
    anexos: os.anexos.map((a) => ({
      id: a.id,
      nome: a.nome,
      url: a.url,
      tipo: a.tipo,
      tamanho: a.tamanho,
    })),
  };

  return NextResponse.json({ data: payload });
}