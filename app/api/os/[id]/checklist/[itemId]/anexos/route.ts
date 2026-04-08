import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  uploadAnexoChecklist,
  deleteAnexoOS,
  parseSupabaseSrc,
} from "@/lib/storageSupabase";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// ── POST /api/os/[id]/checklist/[itemId]/anexos ────────────────────────────
// Faz upload de uma foto e a associa ao item do checklist
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario || !["ADMIN", "SUPERVISOR", "TECNICO"].includes(usuario.cargo))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id: osId, itemId } = await params;

  // Valida que o item pertence à OS
  const item = await (prisma as any).checklistItemOS.findFirst({
    where: { id: itemId, osId },
  });
  if (!item)
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file)
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "Arquivo muito grande (máx 10 MB)" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json(
      { error: "Tipo não permitido. Use imagens (JPEG, PNG, WEBP, GIF)." },
      { status: 400 }
    );

  const bytes = Buffer.from(await file.arrayBuffer());
  const { src, publicUrl } = await uploadAnexoChecklist({
    osId,
    itemId,
    file: bytes,
    filename: file.name,
    contentType: file.type,
  });

  const anexo = await (prisma as any).anexoChecklist.create({
    data: {
      checklistItemId: itemId,
      osId,
      nome: file.name,
      url: src,
      tipo: file.type,
      tamanho: file.size,
    },
  });

  return NextResponse.json({ anexo: { ...anexo, publicUrl } }, { status: 201 });
}

// ── DELETE /api/os/[id]/checklist/[itemId]/anexos?anexoId=xxx ─────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario || !["ADMIN", "SUPERVISOR", "TECNICO"].includes(usuario.cargo))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id: osId, itemId } = await params;
  const { searchParams } = new URL(req.url);
  const anexoId = searchParams.get("anexoId");
  if (!anexoId)
    return NextResponse.json({ error: "anexoId obrigatório" }, { status: 400 });

  const anexo = await (prisma as any).anexoChecklist.findFirst({
    where: { id: anexoId, checklistItemId: itemId, osId },
  });
  if (!anexo)
    return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });

  const parsed = parseSupabaseSrc(anexo.url);
  if (parsed) {
    try { await deleteAnexoOS(parsed.path); } catch { /* já removido */ }
  }

  await (prisma as any).anexoChecklist.delete({ where: { id: anexoId } });
  return NextResponse.json({ ok: true });
}

// ── GET /api/os/[id]/checklist/[itemId]/anexos ────────────────────────────
// Retorna a lista de fotos de um item
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: osId, itemId } = await params;

  const anexos = await (prisma as any).anexoChecklist.findMany({
    where: { checklistItemId: itemId, osId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ anexos });
}