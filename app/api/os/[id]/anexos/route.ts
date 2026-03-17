import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/os/[id]/anexos
// Em produção: substitua o bloco de URL por upload real (Vercel Blob, S3, R2...)
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

  // ⚠️ Dev: URL placeholder. Em produção use Vercel Blob / S3 / R2:
  //   import { put } from "@vercel/blob";
  //   const blob = await put(`os/${osId}/${file.name}`, file, { access: "public" });
  //   const url = blob.url;
  const url = `/uploads/os/${osId}/${encodeURIComponent(file.name)}`;

  const anexo = await prisma.anexo.create({
    data: { osId, nome: file.name, url, tipo: file.type, tamanho: file.size },
  });

  return NextResponse.json({ anexo }, { status: 201 });
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

  await prisma.anexo.delete({ where: { id: anexoId } });
  return NextResponse.json({ ok: true });
}