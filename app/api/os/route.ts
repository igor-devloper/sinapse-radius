import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularSLA, gerarNumeroOS, PRAZO_HORAS } from "@/lib/sla-manual";
import { itensPorMultiplasPeriodicidades, PERIODICIDADE_LABEL } from "@/lib/checklist-preventiva";
import { getAssetBindingsForChecklistItems } from "@/lib/assets";
import { addHours } from "date-fns";
import { z } from "zod";

const db = prisma as any;

// ─── Schemas de validação ─────────────────────────────────────────────────────

const PERIODICIDADES_VALIDAS = [
  "DIARIA", "SEMANAL", "MENSAL", "TRIMESTRAL",
  "SEMESTRAL", "ANUAL", "HORAS_2000", "BIENNIAL",
] as const;

const criarOSPreventivaSchema = z.object({
  tipoOS: z.literal("PREVENTIVA"),
  periodicidadesSelecionadas: z.array(z.enum(PERIODICIDADES_VALIDAS)).min(1, "Selecione ao menos uma periodicidade"),
  titulo: z.string().min(5).max(120).optional(),
  descricao: z.string().optional(),
  motivoOS: z.string().optional(),
  prioridade: z.enum(["CRITICA", "ALTA", "MEDIA", "BAIXA"]).default("MEDIA"),
  dataProgramada: z.string().datetime(),
  dataFimProgramada: z.string().datetime().optional(),
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
  dataEmissaoAxia: z.string().datetime(),
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Busca todas as MinerInstances vinculadas a um containerId (se fornecido)
 * ou a todos os assets do tipo ASIC (isAsicModel = true).
 *
 * Retorna um array de { id: string } pronto para createMany em MinerCheckOS.
 * Nunca lança — em caso de erro retorna array vazio para não bloquear a criação da OS.
 */
async function buscarMinerInstancesParaOS(containerId?: string): Promise<string[]> {
  try {
    const where: Record<string, unknown> = { status: "ativo" };

    if (containerId) {
      // Filtra pelos miners do container específico
      where.containerId = containerId;
    } else {
      // Sem container: busca miners vinculados a assets do tipo ASIC
      where.asset = { isAsicModel: true };
    }

    const miners = await db.minerInstance.findMany({
      where,
      select: { id: true },
      orderBy: [{ containerId: "asc" }, { serialNumber: "asc" }],
    });

    return miners.map((m: { id: string }) => m.id);
  } catch {
    return [];
  }
}

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
        _count: { select: { comentarios: true, anexos: true, checklistItems: true, minerChecks: true } },
      },
      orderBy: [{ prioridade: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

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

  const body   = await req.json();
  const parsed = criarOSSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  const count  = await prisma.ordemServico.count();
  const numero = gerarNumeroOS(count + 1);

  // ── Busca miners ANTES da transação (evita tx longa) ─────────────────────
  // Busca os IDs de MinerInstance vinculados ao containerId (ou todos os ASIC ativos)
  const minerInstanceIds = await buscarMinerInstancesParaOS(data.containerId);

  if (data.tipoOS === "PREVENTIVA") {
    // ── OS Preventiva — MULTI-PERIODICIDADE ────────────────────────────────
    const { periodicidadesSelecionadas } = data;

    const itensChecklist = itensPorMultiplasPeriodicidades(periodicidadesSelecionadas);
    const assetBindings  = await getAssetBindingsForChecklistItems(itensChecklist.map((item) => item.id));

    const labelPeriods = periodicidadesSelecionadas
      .map((p) => PERIODICIDADE_LABEL[p])
      .join(" + ");
    const tituloGerado = data.titulo ?? `Preventiva ${labelPeriods} — ANTSPACE HK3`;

    const periodicidadePrincipal = periodicidadesSelecionadas[0];

    const os = await prisma.$transaction(async (tx) => {
      const novaOS = await tx.ordemServico.create({
        data: {
          numero,
          titulo:                    tituloGerado,
          descricao:                 data.descricao ?? "Execução do checklist preventivo conforme Manual ANTSPACE HK3 V6.",
          motivoOS:                  data.motivoOS  ?? "Manutenção preventiva programada.",
          tipoOS:                    "PREVENTIVA",
          periodicidadesSelecionadas: periodicidadesSelecionadas as string[],
          periodicidadePreventiva:   periodicidadePrincipal as never,
          prioridade:                data.prioridade,
          dataProgramada:            new Date(data.dataProgramada),
          dataFimProgramada:         data.dataFimProgramada ? new Date(data.dataFimProgramada) : null,
          subsistema:                data.subsistema,
          componenteTag:             data.componenteTag,
          containerId:               data.containerId,
          responsavelId:             data.responsavelId || undefined,
          abertoPorId:               usuario.id,
          dataEmissaoAxia: null,
          prazoSLAHoras:   null,
          dataLimiteSLA:   null,
        },
        include: {
          responsavel: { select: { id: true, nome: true, avatarUrl: true } },
          abertoPor:   { select: { id: true, nome: true } },
        },
      });

      // ── Checklist preventivo ──────────────────────────────────────────────
      if (itensChecklist.length > 0) {
        await tx.checklistItemOS.createMany({
          data: itensChecklist.map((item) => ({
            osId:          novaOS.id,
            itemId:        item.id,
            descricao:     item.descricao,
            periodicidade: item.periodicidade,
            subsistema:    item.subsistema,
            referencia:    item.referencia,
            assetId:       assetBindings.get(item.id)?.assetId ?? null,
            status:        "PENDENTE",
          })),
        });
      }

      // ── MinerCheckOS — criados automaticamente se houver miners ───────────
      // Garante que cada ASIC vinculado ao containerId (ou ao parque ASIC)
      // já tenha seu registro na tabela, pronto para o técnico preencher na OS.
      if (minerInstanceIds.length > 0) {
        await (tx as any).minerCheckOS.createMany({
          data: minerInstanceIds.map((minerInstanceId) => ({
            osId:            novaOS.id,
            minerInstanceId,
            status:          "FUNCIONANDO", // default — técnico pode alterar
          })),
          skipDuplicates: true, // segurança contra chamadas duplicadas
        });
      }

      await tx.historicoOS.create({
        data: {
          osId:       novaOS.id,
          statusPara: "ABERTA",
          observacao: `OS preventiva aberta — periodicidades: ${labelPeriods} (${itensChecklist.length} itens de checklist${minerInstanceIds.length > 0 ? `, ${minerInstanceIds.length} miners` : ""})`,
          usuarioId:  usuario.id,
        },
      });

      return novaOS;
    });

    return NextResponse.json({ os, sla: null }, { status: 201 });
  }

  // ── OS Corretiva — COM SLA ────────────────────────────────────────────────
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

    // ── MinerCheckOS para OS corretiva (se tiver containerId com miners) ───
    if (minerInstanceIds.length > 0) {
      await (tx as any).minerCheckOS.createMany({
        data: minerInstanceIds.map((minerInstanceId) => ({
          osId:            novaOS.id,
          minerInstanceId,
          status:          "FUNCIONANDO",
        })),
        skipDuplicates: true,
      });
    }

    await tx.historicoOS.create({
      data: {
        osId:       novaOS.id,
        statusPara: "ABERTA",
        observacao: `OS corretiva aberta — prazo SLA: ${prazoSLAHoras}h (${tipoAtividadeCorretiva})${minerInstanceIds.length > 0 ? ` — ${minerInstanceIds.length} miners vinculados` : ""}`,
        usuarioId:  usuario.id,
      },
    });

    return novaOS;
  });

  return NextResponse.json({ os, sla: calcularSLA(dataEmissaoAxia, tipoAtividadeCorretiva) }, { status: 201 });
}