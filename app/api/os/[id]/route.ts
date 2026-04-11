import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularSLA } from "@/lib/sla-manual";
import { z } from "zod";
import { getChecklistItemsWithAssets } from "@/lib/assets";

type OSApiRecord = {
  id: string;
  tipoOS: "PREVENTIVA" | "CORRETIVA";
  dataEmissaoAxia: Date | null;
  tipoAtividadeCorretiva: string | null;
  responsavel: { id: string; nome: string; email: string; avatarUrl: string | null; cargo: string } | null;
  abertoPor: { id: string; nome: string; email: string };
  comentarios: Array<{
    id: string;
    texto: string;
    createdAt: Date;
    usuario: { id: string; nome: string; avatarUrl: string | null };
  }>;
  historicoOS: Array<{
    id: string;
    statusDe: string | null;
    statusPara: string;
    observacao: string | null;
    createdAt: Date;
    usuario: { id: string; nome: string };
  }>;
  anexos: Array<{ id: string; nome: string; url: string; tipo: string; tamanho: number; createdAt: Date }>;
  topicosCorretiva: Array<{
    id: string;
    titulo: string;
    observacao: string | null;
    ordem: number;
    anexos: Array<{ id: string; nome: string; url: string; tipo: string; tamanho: number; createdAt: Date }>;
  }>;
};

type PrismaOsClient = typeof prisma & {
  ordemServico: {
    findUnique(args: unknown): Promise<OSApiRecord | null>;
  };
};

const db = prisma as PrismaOsClient;

const atualizarOSSchema = z.object({
  status:         z.enum(["ABERTA", "EM_ANDAMENTO", "AGUARDANDO_PECA", "PAUSADA", "CONCLUIDA", "CANCELADA"]).optional(),
  responsavelId:  z.string().optional(),
  subsistema:     z.string().min(2).optional(),
  componenteTag:  z.string().optional().nullable(),
  dataProgramada: z.string().datetime().optional(),
  dataInicio:     z.string().datetime().optional().nullable(),
  dataConclusao:  z.string().datetime().optional().nullable(),
  observacao:     z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const os = await db.ordemServico.findUnique({
    where: { id: (await params).id },
    include: {
      responsavel:  { select: { id: true, nome: true, email: true, avatarUrl: true, cargo: true } },
      abertoPor:    { select: { id: true, nome: true, email: true } },
      comentarios: {
        include: { usuario: { select: { id: true, nome: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
      },
      historicoOS: {
        include: { usuario: { select: { id: true, nome: true } } },
        orderBy: { createdAt: "desc" },
      },
      anexos:        true,
      topicosCorretiva: {
        include: { anexos: { orderBy: { createdAt: "asc" } } },
        orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });

  const checklistItems = await getChecklistItemsWithAssets(os.id);

  // SLA só existe para corretivas
  const sla = os.tipoOS === "CORRETIVA" && os.dataEmissaoAxia && os.tipoAtividadeCorretiva
    ? calcularSLA(os.dataEmissaoAxia, os.tipoAtividadeCorretiva)
    : null;

  return NextResponse.json({ os: { ...os, checklistItems }, sla });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if (!["ADMIN", "SUPERVISOR", "TECNICO"].includes(usuario.cargo))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const os = await prisma.ordemServico.findUnique({ where: { id: (await params).id } });
  if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });

  const body   = await req.json();
  const parsed = atualizarOSSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { status, responsavelId, subsistema, componenteTag, dataProgramada, dataInicio, dataConclusao, observacao } = parsed.data;

  const osAtualizada = await prisma.$transaction(async (tx) => {
    const updated = await tx.ordemServico.update({
      where: { id: os.id },
      data: {
        ...(status         !== undefined && { status }),
        ...(responsavelId  !== undefined && { responsavelId: responsavelId || null }),
        ...(subsistema     !== undefined && { subsistema }),
        ...(componenteTag  !== undefined && { componenteTag: componenteTag || null }),
        ...(dataProgramada !== undefined && { dataProgramada: new Date(dataProgramada) }),
        ...(dataInicio     !== undefined && { dataInicio:     dataInicio ? new Date(dataInicio) : null }),
        ...(dataConclusao  !== undefined && { dataConclusao:  dataConclusao ? new Date(dataConclusao) : null }),
      },
      include: {
        responsavel: { select: { id: true, nome: true, email: true, avatarUrl: true, cargo: true } },
        abertoPor:   { select: { id: true, nome: true, email: true } },
      },
    });

    if (status && status !== os.status) {
      await tx.historicoOS.create({
        data: {
          osId:       os.id,
          statusDe:   os.status,
          statusPara: status,
          observacao: observacao ?? null,
          usuarioId:  usuario.id,
        },
      });
    }

    return updated;
  });

  const sla = osAtualizada.tipoOS === "CORRETIVA" && osAtualizada.dataEmissaoAxia && osAtualizada.tipoAtividadeCorretiva
    ? calcularSLA(osAtualizada.dataEmissaoAxia, osAtualizada.tipoAtividadeCorretiva)
    : null;

  return NextResponse.json({ os: osAtualizada, sla });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario || usuario.cargo !== "ADMIN")
    return NextResponse.json({ error: "Apenas administradores podem excluir OS" }, { status: 403 });

  await prisma.ordemServico.delete({ where: { id: (await params).id } });
  return NextResponse.json({ ok: true });
}
