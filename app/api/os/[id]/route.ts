import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularSLA } from "@/lib/sla-manual";
import { z } from "zod";

const atualizarOSSchema = z.object({
  status:        z.enum(["ABERTA","EM_ANDAMENTO","AGUARDANDO_PECA","PAUSADA","CONCLUIDA","CANCELADA"]).optional(),
  responsavelId: z.string().optional(),
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
      responsavel: { select: { id: true, nome: true, email: true, avatarUrl: true, cargo: true } },
      abertoPor:   { select: { id: true, nome: true, email: true } },
      comentarios: {
        include: { usuario: { select: { id: true, nome: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
      },
      historicoOS: {
        include: { usuario: { select: { id: true, nome: true } } },
        orderBy: { createdAt: "desc" },
      },
      anexos: true,
    },
  });

  if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
  return NextResponse.json({ os, sla: calcularSLA(os.dataEmissaoAxia, os.tipoAtividade) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if (!["ADMIN","SUPERVISOR","TECNICO"].includes(usuario.cargo))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const os = await prisma.ordemServico.findUnique({ where: { id: (await params).id } });
  if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });

  const body = await req.json();
  const parsed = atualizarOSSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  // Auto-preenche dataInicio ao mudar para EM_ANDAMENTO (se não informado)
  let autoDataInicio: Date | undefined = undefined
  if (data.status === "EM_ANDAMENTO" && !os.dataInicio && data.dataInicio === undefined) {
    autoDataInicio = new Date()
  }

  // Auto-preenche dataConclusao ao mudar para CONCLUIDA (se não informado)
  let autoDataConclusao: Date | undefined = undefined
  if (data.status === "CONCLUIDA" && !os.dataConclusao && data.dataConclusao === undefined) {
    autoDataConclusao = new Date()
  }

  const osAtualizada = await prisma.ordemServico.update({
    where: { id: (await params).id },
    data: {
      ...(data.status && { status: data.status }),
      ...(data.responsavelId !== undefined && { responsavelId: data.responsavelId || null }),
      ...(data.dataProgramada && { dataProgramada: new Date(data.dataProgramada) }),
      // dataInicio — explícito ou auto
      ...(data.dataInicio !== undefined
        ? { dataInicio: data.dataInicio ? new Date(data.dataInicio) : null }
        : autoDataInicio ? { dataInicio: autoDataInicio } : {}),
      // dataConclusao — explícito ou auto
      ...(data.dataConclusao !== undefined
        ? { dataConclusao: data.dataConclusao ? new Date(data.dataConclusao) : null }
        : autoDataConclusao ? { dataConclusao: autoDataConclusao } : {}),
    },
  });

  if (data.status && data.status !== os.status) {
    await prisma.historicoOS.create({
      data: {
        osId:       os.id,
        statusDe:   os.status,
        statusPara: data.status,
        observacao: data.observacao,
        usuarioId:  usuario.id,
      },
    });
  }

  return NextResponse.json({
    os: osAtualizada,
    sla: calcularSLA(osAtualizada.dataEmissaoAxia, osAtualizada.tipoAtividade),
  });
}