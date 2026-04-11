import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularSLA } from "@/lib/sla-manual";
import { decodeConclusao, isConclusaoComentario } from "@/lib/os-conclusao";

type OSRelatorioRecord = {
  id: string;
  numero: string;
  titulo: string;
  descricao: string;
  motivoOS: string;
  tipoOS: "PREVENTIVA" | "CORRETIVA";
  status: "ABERTA" | "EM_ANDAMENTO" | "AGUARDANDO_PECA" | "PAUSADA" | "CONCLUIDA" | "CANCELADA";
  prioridade: "CRITICA" | "ALTA" | "MEDIA" | "BAIXA";
  subsistema: string;
  componenteTag: string | null;
  containerId: string | null;
  tipoAtividadeCorretiva: string | null;
  dataEmissaoAxia: Date | null;
  dataLimiteSLA: Date | null;
  prazoSLAHoras: number | null;
  slaVencido: boolean;
  dataProgramada: Date | null;
  dataInicio: Date | null;
  dataConclusao: Date | null;
  createdAt: Date;
  responsavel: { nome: string; email: string; cargo: string } | null;
  abertoPor: { nome: string; email: string };
  comentarios: Array<{
    texto: string;
    createdAt: Date;
    usuario: { nome: string };
  }>;
  historicoOS: Array<{
    statusDe: string | null;
    statusPara: string;
    observacao: string | null;
    createdAt: Date;
    usuario: { nome: string };
  }>;
  anexos: Array<{ id: string; nome: string; url: string; tipo: string; tamanho: number }>;
  topicosCorretiva: Array<{
    id: string;
    titulo: string;
    observacao: string | null;
    ordem: number;
    updatedAt: Date;
    anexos: Array<{ id: string; nome: string; url: string; tipo: string; tamanho: number }>;
  }>;
  checklistItems: Array<{
    id: string;
    itemId: string;
    descricao: string;
    periodicidade: string;
    subsistema: string;
    referencia: string;
    status: "PENDENTE" | "CONFORME" | "NAO_APLICAVEL" | "NAO_CONFORME" | "CONFORME_COM_RESSALVAS";
    observacao: string | null;
    atualizadoEm: Date | null;
    asset: { nome: string | null; codigo: string | null; fotoUrl: string | null } | null;
    anexos: Array<{ id: string; nome: string; url: string; tipo: string; tamanho: number }>;
  }>;
};

type PrismaRelatorioClient = typeof prisma & {
  ordemServico: {
    findUnique(args: unknown): Promise<OSRelatorioRecord | null>;
  };
};

const db = prisma as PrismaRelatorioClient;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const osId = (await params).id;

  const os = await db.ordemServico.findUnique({
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
      anexos: { orderBy: { createdAt: "asc" } },
      topicosCorretiva: {
        include: { anexos: { orderBy: { createdAt: "asc" } } },
        orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
      },
      checklistItems: {
        include: {
          asset: { select: { nome: true, codigo: true, fotoUrl: true } },
          anexos: { orderBy: { createdAt: "asc" } },
        },
        orderBy: [{ subsistema: "asc" }, { itemId: "asc" }],
      },
    },
  });

  if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });

  if (os.status !== "CONCLUIDA") {
    return NextResponse.json(
      { error: "Relatório disponível apenas para OS com status CONCLUIDA" },
      { status: 400 }
    );
  }

  // ── SLA apenas para corretivas com dados suficientes ──────────────────
  const isCorretiva = os.tipoOS === "CORRETIVA";
  const sla =
    isCorretiva && os.dataEmissaoAxia && os.tipoAtividadeCorretiva
      ? calcularSLA(os.dataEmissaoAxia, os.tipoAtividadeCorretiva)
      : null;

  // ── "tipoAtividade" que o gerador de PDF espera ───────────────────────
  // O PDF usa esse campo para exibir label e definir "PREVENTIVA" vs "CORRETIVA"
  const tipoAtividadeParaPDF =
    os.tipoOS === "PREVENTIVA"
      ? "MANUTENCAO_PREVENTIVA_GERAL"
      : (os.tipoAtividadeCorretiva ?? "OUTRO");

  const checklistItemsParaPDF =
    os.tipoOS === "CORRETIVA"
      ? os.topicosCorretiva.map((topico, index) => ({
          id: topico.id,
          itemId: `TOP-${String(index + 1).padStart(2, "0")}`,
          descricao: topico.titulo,
          periodicidade: `Tópico ${index + 1}`,
          subsistema: os.subsistema,
          referencia: "Manutenção corretiva",
          status: "CONFORME" as const,
          observacao: topico.observacao,
          atualizadoEm: topico.updatedAt?.toISOString?.() ?? null,
          assetNome: null,
          assetCodigo: null,
          assetFotoUrl: null,
          fotos: topico.anexos
            .filter((a) => a.tipo.startsWith("image/"))
            .map((a) => ({
              id: a.id,
              nome: a.nome,
              url: a.url,
              tipo: a.tipo,
              tamanho: a.tamanho,
            })),
        }))
      : os.checklistItems.map((item) => ({
          id:           item.id,
          itemId:       item.itemId,
          descricao:    item.descricao,
          periodicidade: item.periodicidade,
          subsistema:   item.subsistema,
          referencia: item.referencia,
          status: item.status,
          observacao: item.observacao,
          atualizadoEm: item.atualizadoEm?.toISOString() ?? null,
          assetNome: item.asset?.nome ?? null,
          assetCodigo: item.asset?.codigo ?? null,
          assetFotoUrl: item.asset?.fotoUrl ?? null,
          fotos: item.anexos
            .filter((a) => a.tipo.startsWith("image/"))
            .map((a) => ({
              id: a.id,
              nome: a.nome,
              url: a.url,
              tipo: a.tipo,
              tamanho: a.tamanho,
            })),
        }));

  const payload = {
    id: os.id,
    numero: os.numero,
    titulo: os.titulo,
    descricao: os.descricao,
    motivoOS: os.motivoOS,
    tipoAtividade: tipoAtividadeParaPDF,
    status: os.status,
    prioridade: os.prioridade,
    subsistema: os.subsistema,
    componenteTag: os.componenteTag,
    containerId: os.containerId,

    // ── SLA (nullable para preventivas) ───────────────────────────────
    dataEmissaoAxia: os.dataEmissaoAxia?.toISOString() ?? "",
    dataLimiteSLA:   os.dataLimiteSLA?.toISOString()   ?? "",
    prazoSLAHoras:   os.prazoSLAHoras  ?? 0,
    slaVencido:      os.slaVencido,

    sla: sla
      ? {
          statusLabel:         sla.statusLabel,
          statusColor:         sla.statusColor,
          tempoFormatado:      sla.tempoFormatado,
          percentualDecorrido: sla.percentualDecorrido,
          referenciaManual:    sla.referenciaManual,
          isCorretiva:         true,
          atuacaoHoras:        sla.atuacaoHoras        ?? null,
          dataLimiteAtuacao:   sla.dataLimiteAtuacao?.toISOString() ?? null,
        }
      : {
          statusLabel:         "N/A",
          statusColor:         "green" as const,
          tempoFormatado:      "—",
          percentualDecorrido: 0,
          referenciaManual:    "—",
          isCorretiva:         false,
          atuacaoHoras:        null,
          dataLimiteAtuacao:   null,
        },

    // ── Datas ──────────────────────────────────────────────────────────
    dataProgramada: os.dataProgramada?.toISOString() ?? null,
    dataInicio:     os.dataInicio?.toISOString()     ?? null,
    dataConclusao:  os.dataConclusao?.toISOString()  ?? null,
    createdAt:      os.createdAt.toISOString(),

    // ── Equipe ─────────────────────────────────────────────────────────
    responsavel: os.responsavel,
    abertoPor:   os.abertoPor,
    conclusaoManual: (() => {
      const c = [...os.comentarios].reverse().find((x) => isConclusaoComentario(x.texto));
      return c ? decodeConclusao(c.texto) : null;
    })(),
    topicosCorretiva: os.topicosCorretiva.map((topico) => ({
      id: topico.id,
      titulo: topico.titulo,
      observacao: topico.observacao,
      ordem: topico.ordem,
      fotos: topico.anexos
        .filter((a) => a.tipo.startsWith("image/"))
        .map((a) => ({
          id: a.id,
          nome: a.nome,
          url: a.url,
          tipo: a.tipo,
          tamanho: a.tamanho,
        })),
    })),

    // ── Checklist ──────────────────────────────────────────────────────
    checklistItems: checklistItemsParaPDF,

    // ── Comentários ────────────────────────────────────────────────────
    comentarios: os.comentarios
      .filter((c) => !isConclusaoComentario(c.texto))
      .map((c) => ({
      texto:     c.texto,
      usuario:   c.usuario.nome,
      createdAt: c.createdAt.toISOString(),
    })),

    // ── Histórico ──────────────────────────────────────────────────────
    historico: os.historicoOS.map((h) => ({
      statusDe:   h.statusDe,
      statusPara: h.statusPara,
      observacao: h.observacao,
      usuario:    h.usuario.nome,
      createdAt:  h.createdAt.toISOString(),
    })),

    // ── Anexos ─────────────────────────────────────────────────────────
    anexos: os.anexos.map((a) => ({
      id:      a.id,
      nome:    a.nome,
      url:     a.url,
      tipo:    a.tipo,
      tamanho: a.tamanho,
    })),
  };

  return NextResponse.json({ data: payload });
}
