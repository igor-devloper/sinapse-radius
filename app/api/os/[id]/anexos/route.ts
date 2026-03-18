import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadAnexoOS, deleteAnexoOS, parseSupabaseSrc } from "@/lib/storageSupabase";

const ALLOWED_TYPES = [
  "image/jpeg","image/png","image/webp","image/gif","application/pdf",
];

// POST /api/os/[id]/anexos
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const osId = (await params).id;
  const os = await prisma.ordemServico.findUnique({ where: { id: osId } });
  if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: "Arquivo muito grande (máx 10 MB)" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Tipo não permitido. Use imagens ou PDF." }, { status: 400 });

  // Upload para Supabase Storage
  const bytes = Buffer.from(await file.arrayBuffer());
  const { src, publicUrl } = await uploadAnexoOS({
    osId,
    file: bytes,
    filename: file.name,
    contentType: file.type,
  });

  const anexo = await prisma.anexo.create({
    data: {
      osId,
      nome: file.name,
      url: src,        // armazena o src supabase://... para referência
      tipo: file.type,
      tamanho: file.size,
    },
  });

  return NextResponse.json({ anexo: { ...anexo, publicUrl } }, { status: 201 });
}

// DELETE /api/os/[id]/anexos?anexoId=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario || !["ADMIN","SUPERVISOR","TECNICO"].includes(usuario.cargo))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const anexoId = searchParams.get("anexoId");
  if (!anexoId) return NextResponse.json({ error: "anexoId obrigatório" }, { status: 400 });

  const anexo = await prisma.anexo.findUnique({ where: { id: anexoId } });
  if (!anexo) return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });

  // Remove do Supabase Storage
  const parsed = parseSupabaseSrc(anexo.url);
  if (parsed) {
    try { await deleteAnexoOS(parsed.path); } catch { /* ignora se já removido */ }
  }

  await prisma.anexo.delete({ where: { id: anexoId } });
  return NextResponse.json({ ok: true });
}