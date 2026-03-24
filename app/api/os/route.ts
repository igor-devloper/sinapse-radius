import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularSLA, gerarNumeroOS, PRAZO_HORAS } from "@/lib/sla-manual";
import { itensPorPeriodicidade, PERIODICIDADE_LABEL } from "@/lib/checklist-preventiva";
import { addHours } from "date-fns";
import { z } from "zod";

// ─── Schemas de validação ─────────────────────────────────────────────────────

const criarOSPreventivaSchema = z.object({
  tipoOS: z.literal("PREVENTIVA"),
  periodicidadePreventiva: z.enum([
    "DIARIA", "SEMANAL", "MENSAL", "TRIMESTRAL",
    "SEMESTRAL", "ANUAL", "HORAS_2000", "BIENNIAL",
  ]),
  titulo: z.string().min(5).max(120).optional(),
  descricao: z.string().optional(),
  motivoOS: z.string().optional(),
  prioridade: z.enum(["CRITICA", "ALTA", "MEDIA", "BAIXA"]).default("MEDIA"),
  dataProgramada: z.string().datetime(),
  subsistema: z.string().default("Geral"),
  componenteTag: z.string().optional(),
  containerId: z.string().optional(),
  responsavelId: z.string().optional(),
});

const criarOSCoretivaSchema = z.object({
  tipoOS: z.literal("CORRETIVA"),
  tipoAtividadeCorretiva: z.enum([
    "FALHA_ENERGIA", "FALHA_BOMBA_CIRCULACAO", "FALHA_VENTILADOR_EXAUSTAO",
    "FALHA_BOMBA_REPOSICAO", "ALARME_VAZAMENTO", "ALARME_ALTA_TEMPERATURA",
    "ALARME_ALTA_PRESSAO", "ALARME_BAIXA_PRESSAO", "ALARME_BAIXA_VAZAO",
    "ALARME_CONDENSACAO", "FALHA_VEDACAO_BOMBA", "FALHA_VENTILADOR_TORRE",
    "SUBSTITUICAO_VALVULA_EXAUSTAO", "SUBSTITUICAO_VENTILADOR_TORRE", "OUTRO",
  ]),
  titulo: z.string().min(5).max(120),
  descricao: z.string().min(10),
  motivoOS: z.string().min(5),
  prioridade: z.enum(["CRITICA", "ALTA", "MEDIA", "BAIXA"]).default("MEDIA"),
  dataEmissaoAxia: z.string().datetime(),    // data de abertura pelo contratante (SLA)
  dataProgramada: z.string().datetime().optional(),
  subsistema: z.string().min(2),
  componenteTag: z.string().optional(),
  containerId: z.string().optional(),
  responsavelId: z.string().optional(),
});

const criarOSSchema = z.discriminatedUnion("tipoOS", [
  criarOSPreventivaSchema,
  criarOSCoretivaSchema,
]);

// ─── GET /api/os ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const where: Record<string, unknown> = {};

  if (searchParams.get("status"))    where.status    = searchParams.get("status");
  if (searchParams.get("prioridade")) where.prioridade = searchParams.get("prioridade");
  if (searchParams.get("tipoOS"))    where.tipoOS    = searchParams.get("tipoOS");

  const q = searchParams.get("q");
  if (q) {
    where.OR = [
      { titulo:     { contains: q, mode: "insensitive" } },
      { numero:     { contains: q, mode: "insensitive" } },
      { subsistema: { contains: q, mode: "insensitive" } },
    ];
  }

  const page  = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;

  const [total, ordens] = await Promise.all([
    prisma.ordemServico.count({ where }),
    prisma.ordemServico.findMany({
      where,
      include: {
        responsavel: { select: { id: true, nome: true, avatarUrl: true } },
        abertoPor:   { select: { id: true, nome: true } },
        _count: { select: { comentarios: true, anexos: true, checklistItems: true } },
      },
      orderBy: [{ prioridade: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // SLA apenas para corretivas
  const ordensComInfo = ordens.map((os) => ({
    ...os,
    sla: os.tipoOS === "CORRETIVA" && os.dataEmissaoAxia && os.tipoAtividadeCorretiva
      ? calcularSLA(os.dataEmissaoAxia, os.tipoAtividadeCorretiva)
      : null,
  }));

  return NextResponse.json({ ordens: ordensComInfo, total, page, pages: Math.ceil(total / limit) });
}

// ─── POST /api/os ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if (!["ADMIN", "SUPERVISOR", "TECNICO"].includes(usuario.cargo))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body  = await req.json();
  const parsed = criarOSSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  const count  = await prisma.ordemServico.count();
  const numero = gerarNumeroOS(count + 1);

  if (data.tipoOS === "PREVENTIVA") {
    // ── OS Preventiva — SEM SLA ─────────────────────────────────────────────
    const { periodicidadePreventiva } = data;
    const itensChecklist = itensPorPeriodicidade(periodicidadePreventiva);
    const tituloGerado = data.titulo
      ?? `Preventiva ${PERIODICIDADE_LABEL[periodicidadePreventiva]} — ANTSPACE HK3`;

    const os = await prisma.$transaction(async (tx) => {
      const novaOS = await tx.ordemServico.create({
        data: {
          numero,
          titulo:                  tituloGerado,
          descricao:               data.descricao ?? "Execução do checklist preventivo conforme Manual ANTSPACE HK3 V6.",
          motivoOS:                data.motivoOS  ?? "Manutenção preventiva programada.",
          tipoOS:                  "PREVENTIVA",
          periodicidadePreventiva: periodicidadePreventiva as never,
          prioridade:              data.prioridade,
          dataProgramada:          new Date(data.dataProgramada),
          subsistema:              data.subsistema,
          componenteTag:           data.componenteTag,
          containerId:             data.containerId,
          responsavelId:           data.responsavelId || undefined,
          abertoPorId:             usuario.id,
          // SLA: null para preventivas
          dataEmissaoAxia: null,
          prazoSLAHoras:   null,
          dataLimiteSLA:   null,
        },
        include: {
          responsavel: { select: { id: true, nome: true, avatarUrl: true } },
          abertoPor:   { select: { id: true, nome: true } },
        },
      });

      // Gera apenas os itens do checklist da periodicidade correta
      if (itensChecklist.length > 0) {
        await tx.checklistItemOS.createMany({
          data: itensChecklist.map((item) => ({
            osId:          novaOS.id,
            itemId:        item.id,
            descricao:     item.descricao,
            periodicidade: item.periodicidade,
            subsistema:    item.subsistema,
            referencia:    item.referencia,
            status:        "PENDENTE",
          })),
        });
      }

      await tx.historicoOS.create({
        data: {
          osId:       novaOS.id,
          statusPara: "ABERTA",
          observacao: `OS preventiva aberta — periodicidade: ${PERIODICIDADE_LABEL[periodicidadePreventiva]} (${itensChecklist.length} itens de checklist)`,
          usuarioId:  usuario.id,
        },
      });

      return novaOS;
    });

    return NextResponse.json({ os, sla: null }, { status: 201 });
  }

  // ── OS Corretiva — COM SLA ──────────────────────────────────────────────────
  const { tipoAtividadeCorretiva, dataEmissaoAxia: dataEmissaoStr } = data;
  const dataEmissaoAxia = new Date(dataEmissaoStr);
  const prazoSLAHoras   = PRAZO_HORAS[tipoAtividadeCorretiva] ?? 72;
  const dataLimiteSLA   = addHours(dataEmissaoAxia, prazoSLAHoras);

  const os = await prisma.$transaction(async (tx) => {
    const novaOS = await tx.ordemServico.create({
      data: {
        numero,
        titulo:                data.titulo,
        descricao:             data.descricao,
        motivoOS:              data.motivoOS,
        tipoOS:                "CORRETIVA",
        tipoAtividadeCorretiva: tipoAtividadeCorretiva as never,
        prioridade:            data.prioridade,
        dataEmissaoAxia,
        prazoSLAHoras,
        dataLimiteSLA,
        dataProgramada:        data.dataProgramada ? new Date(data.dataProgramada) : undefined,
        subsistema:            data.subsistema,
        componenteTag:         data.componenteTag,
        containerId:           data.containerId,
        responsavelId:         data.responsavelId || undefined,
        abertoPorId:           usuario.id,
      },
      include: {
        responsavel: { select: { id: true, nome: true, avatarUrl: true } },
        abertoPor:   { select: { id: true, nome: true } },
      },
    });

    await tx.historicoOS.create({
      data: {
        osId:       novaOS.id,
        statusPara: "ABERTA",
        observacao: `OS corretiva aberta — prazo SLA: ${prazoSLAHoras}h (${tipoAtividadeCorretiva})`,
        usuarioId:  usuario.id,
      },
    });

    return novaOS;
  });

  return NextResponse.json({ os, sla: calcularSLA(dataEmissaoAxia, tipoAtividadeCorretiva) }, { status: 201 });
}