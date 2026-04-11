import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  deleteAnexoOS,
  parseSupabaseSrc,
  uploadAnexoTopicoCorretiva,
} from "@/lib/storageSupabase";

type TopicoCorretivaAnexoRecord = {
  id: string;
  topicoId: string;
  osId: string;
  nome: string;
  url: string;
  tipo: string;
  tamanho: number;
  createdAt: Date;
};

type DbTopicosCorretiva = typeof prisma & {
  topicoCorretivaOS: {
    findFirst(args: unknown): Promise<{ id: string } | null>;
  };
  anexoTopicoCorretiva: {
    findMany(args: unknown): Promise<TopicoCorretivaAnexoRecord[]>;
    create(args: unknown): Promise<TopicoCorretivaAnexoRecord>;
    findFirst(args: unknown): Promise<TopicoCorretivaAnexoRecord | null>;
    delete(args: unknown): Promise<{ id: string }>;
  };
};

const db = prisma as DbTopicosCorretiva;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024;

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
  { params }: { params: Promise<{ id: string; topicoId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: osId, topicoId } = await params;
  const anexos = await db.anexoTopicoCorretiva.findMany({
    where: { osId, topicoId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ anexos });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; topicoId: string }> }
) {
  const acesso = await validarAcessoEdicao();
  if ("error" in acesso) return acesso.error;

  const { id: osId, topicoId } = await params;
  const topico = await db.topicoCorretivaOS.findFirst({
    where: { id: topicoId, osId },
    select: { id: true },
  });
  if (!topico) return NextResponse.json({ error: "Tópico não encontrado" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande (máx 10 MB)" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Tipo não permitido. Use imagens (JPEG, PNG, WEBP, GIF)." },
      { status: 400 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const { src, publicUrl } = await uploadAnexoTopicoCorretiva({
    osId,
    topicoId,
    file: bytes,
    filename: file.name,
    contentType: file.type,
  });

  const anexo = await db.anexoTopicoCorretiva.create({
    data: {
      osId,
      topicoId,
      nome: file.name,
      url: src,
      tipo: file.type,
      tamanho: file.size,
    },
  });

  return NextResponse.json({ anexo: { ...anexo, publicUrl } }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; topicoId: string }> }
) {
  const acesso = await validarAcessoEdicao();
  if ("error" in acesso) return acesso.error;

  const { id: osId, topicoId } = await params;
  const { searchParams } = new URL(req.url);
  const anexoId = searchParams.get("anexoId");
  if (!anexoId) return NextResponse.json({ error: "anexoId obrigatório" }, { status: 400 });

  const anexo = await db.anexoTopicoCorretiva.findFirst({
    where: { id: anexoId, osId, topicoId },
  });
  if (!anexo) return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });

  const parsed = parseSupabaseSrc(anexo.url);
  if (parsed) {
    try {
      await deleteAnexoOS(parsed.path);
    } catch {
      // noop
    }
  }

  await db.anexoTopicoCorretiva.delete({ where: { id: anexoId } });
  return NextResponse.json({ ok: true });
}
