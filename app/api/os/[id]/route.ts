import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularSLA } from "@/lib/sla-manual";
import { z } from "zod";
import { getChecklistItemsWithAssets } from "@/lib/assets";

const atualizarOSSchema = z.object({
  status:         z.enum(["ABERTA", "EM_ANDAMENTO", "AGUARDANDO_PECA", "PAUSADA", "CONCLUIDA", "CANCELADA"]).optional(),
  responsavelId:  z.string().optional(),
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

  const os = await prisma.ordemServico.findUnique({
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

  const { status, responsavelId, dataProgramada, dataInicio, dataConclusao, observacao } = parsed.data;

  const osAtualizada = await prisma.$transaction(async (tx) => {
    const updated = await tx.ordemServico.update({
      where: { id: os.id },
      data: {
        ...(status         !== undefined && { status }),
        ...(responsavelId  !== undefined && { responsavelId: responsavelId || null }),
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