import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularSLA, gerarNumeroOS, PRAZO_HORAS } from "@/lib/sla-manual";
import { addHours } from "date-fns";
import { z } from "zod";

const criarOSSchema = z.object({
  titulo: z.string().min(5).max(120),
  descricao: z.string().min(10),
  motivoOS: z.string().min(5),
  tipoAtividade: z.string(),
  prioridade: z.enum(["CRITICA", "ALTA", "MEDIA", "BAIXA"]).default("MEDIA"),
  dataEmissaoAxia: z.string().datetime(), // ISO 8601 — data/hora da OS emitida pela Axia
  dataProgramada: z.string().datetime().optional(),
  subsistema: z.string().min(2),
  componenteTag: z.string().optional(),
  containerId: z.string().optional(),
  responsavelId: z.string().optional(),
});

// GET /api/os
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const prioridade = searchParams.get("prioridade");
  const subsistema = searchParams.get("subsistema");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (prioridade) where.prioridade = prioridade;
  if (subsistema) where.subsistema = { contains: subsistema, mode: "insensitive" };
  const q = searchParams.get("q");
  if (q) {
    where.OR = [
      { titulo: { contains: q, mode: "insensitive" } },
      { numero: { contains: q, mode: "insensitive" } },
      { subsistema: { contains: q, mode: "insensitive" } },
      { componenteTag: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, ordens] = await Promise.all([
    prisma.ordemServico.count({ where }),
    prisma.ordemServico.findMany({
      where,
      include: {
        responsavel: { select: { id: true, nome: true, avatarUrl: true } },
        abertoPor: { select: { id: true, nome: true } },
        _count: { select: { comentarios: true, anexos: true } },
      },
      orderBy: [{ prioridade: "asc" }, { dataEmissaoAxia: "asc" }],
      skip,
      take: limit,
    }),
  ]);

  const ordensComSLA = ordens.map((os) => ({
    ...os,
    sla: calcularSLA(os.dataEmissaoAxia, os.tipoAtividade),
  }));

  return NextResponse.json({ ordens: ordensComSLA, total, page, pages: Math.ceil(total / limit) });
}

// POST /api/os
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  if (!["ADMIN", "SUPERVISOR", "TECNICO"].includes(usuario.cargo)) {
    return NextResponse.json({ error: "Sem permissão para abrir OS" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = criarOSSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const dataEmissaoAxia = new Date(data.dataEmissaoAxia);
  const prazoSLAHoras = PRAZO_HORAS[data.tipoAtividade] ?? 72;
  const dataLimiteSLA = addHours(dataEmissaoAxia, prazoSLAHoras);

  const count = await prisma.ordemServico.count();
  const numero = gerarNumeroOS(count + 1);

  const os = await prisma.ordemServico.create({
    data: {
      numero,
      titulo: data.titulo,
      descricao: data.descricao,
      motivoOS: data.motivoOS,
      tipoAtividade: data.tipoAtividade as never,
      prioridade: data.prioridade,
      dataEmissaoAxia,
      prazoSLAHoras,
      dataLimiteSLA,
      dataProgramada: data.dataProgramada ? new Date(data.dataProgramada) : undefined,
      subsistema: data.subsistema,
      componenteTag: data.componenteTag,
      containerId: data.containerId,
      responsavelId: data.responsavelId,
      abertoPorId: usuario.id,
    },
    include: {
      responsavel: { select: { id: true, nome: true, avatarUrl: true } },
      abertoPor: { select: { id: true, nome: true } },
    },
  });

  await prisma.historicoOS.create({
    data: {
      osId: os.id,
      statusPara: "ABERTA",
      observacao: `OS aberta — prazo SLA: ${prazoSLAHoras}h (${data.tipoAtividade})`,
      usuarioId: usuario.id,
    },
  });

  return NextResponse.json({ os, sla: calcularSLA(dataEmissaoAxia, data.tipoAtividade) }, { status: 201 });
}
