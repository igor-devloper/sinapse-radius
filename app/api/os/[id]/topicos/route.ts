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
    findMany(args: unknown): Promise<TopicoCorretivaRecord[]>;
    findFirst(args: unknown): Promise<Pick<TopicoCorretivaRecord, "ordem"> | null>;
    create(args: unknown): Promise<TopicoCorretivaRecord>;
  };
};

const db = prisma as DbTopicosCorretiva;

const createSchema = z.object({
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: osId } = await params;
  const topicos = await db.topicoCorretivaOS.findMany({
    where: { osId },
    include: { anexos: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ topicos });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acesso = await validarAcessoEdicao();
  if ("error" in acesso) return acesso.error;

  const { id: osId } = await params;
  const os = await prisma.ordemServico.findUnique({
    where: { id: osId },
    select: { id: true, tipoOS: true, status: true },
  });

  if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
  if (os.tipoOS !== "CORRETIVA") {
    return NextResponse.json({ error: "Tópicos disponíveis apenas para OS corretiva" }, { status: 400 });
  }
  if (os.status === "CONCLUIDA" || os.status === "CANCELADA") {
    return NextResponse.json({ error: "Não é possível editar uma OS concluída ou cancelada" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const ultimo = await db.topicoCorretivaOS.findFirst({
    where: { osId },
    orderBy: [{ ordem: "desc" }, { createdAt: "desc" }],
    select: { ordem: true },
  });

  const topico = await db.topicoCorretivaOS.create({
    data: {
      osId,
      titulo: parsed.data.titulo,
      observacao: parsed.data.observacao?.trim() || null,
      ordem: (ultimo?.ordem ?? -1) + 1,
    },
    include: { anexos: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ topico }, { status: 201 });
}
