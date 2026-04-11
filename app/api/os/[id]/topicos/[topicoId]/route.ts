import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type TopicoCorretivaRecord = {
  id: string;
  osId: string;
  titulo: string;
  observacao: string | null;
  ordem: number;
  createdAt: Date;
  updatedAt: Date;
  anexos: Array<{
    id: string;
    nome: string;
    url: string;
    tipo: string;
    tamanho: number;
    createdAt: Date;
  }>;
};

type DbTopicosCorretiva = typeof prisma & {
  topicoCorretivaOS: {
    findFirst(args: unknown): Promise<Pick<TopicoCorretivaRecord, "id"> | null>;
    update(args: unknown): Promise<TopicoCorretivaRecord>;
    delete(args: unknown): Promise<{ id: string }>;
  };
};

const db = prisma as DbTopicosCorretiva;

const updateSchema = z.object({
  titulo: z.string().trim().min(1, "Título obrigatório").max(200),
  observacao: z.string().max(4000).optional().nullable(),
});

async function validarAcessoEdicao() {
  const { userId } = await auth();
  if (!userId) {
    return { error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }) };
  }

  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario || !["ADMIN", "SUPERVISOR", "TECNICO"].includes(usuario.cargo)) {
    return { error: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  }

  return { usuario };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; topicoId: string }> }
) {
  const acesso = await validarAcessoEdicao();
  if ("error" in acesso) return acesso.error;

  const { id: osId, topicoId } = await params;
  const os = await prisma.ordemServico.findUnique({
    where: { id: osId },
    select: { id: true, status: true },
  });
  if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
  if (os.status === "CONCLUIDA" || os.status === "CANCELADA") {
    return NextResponse.json({ error: "Não é possível editar uma OS concluída ou cancelada" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const topicoExistente = await db.topicoCorretivaOS.findFirst({
    where: { id: topicoId, osId },
    select: { id: true },
  });
  if (!topicoExistente) {
    return NextResponse.json({ error: "Tópico não encontrado" }, { status: 404 });
  }

  const topico = await db.topicoCorretivaOS.update({
    where: { id: topicoId },
    data: {
      titulo: parsed.data.titulo,
      observacao: parsed.data.observacao?.trim() || null,
    },
    include: { anexos: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ topico });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; topicoId: string }> }
) {
  const acesso = await validarAcessoEdicao();
  if ("error" in acesso) return acesso.error;

  const { id: osId, topicoId } = await params;
  const os = await prisma.ordemServico.findUnique({
    where: { id: osId },
    select: { id: true, status: true },
  });
  if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
  if (os.status === "CONCLUIDA" || os.status === "CANCELADA") {
    return NextResponse.json({ error: "Não é possível editar uma OS concluída ou cancelada" }, { status: 400 });
  }

  const topicoExistente = await db.topicoCorretivaOS.findFirst({
    where: { id: topicoId, osId },
    select: { id: true },
  });
  if (!topicoExistente) {
    return NextResponse.json({ error: "Tópico não encontrado" }, { status: 404 });
  }

  await db.topicoCorretivaOS.delete({ where: { id: topicoId } });
  return NextResponse.json({ ok: true });
}
