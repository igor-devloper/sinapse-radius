import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAsset, listAssets, normalizeChecklistItemIds } from "@/lib/assets";
import { uploadFotoAsset } from "@/lib/storageSupabase";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function randomAssetId() {
  return `asset_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const assets = await listAssets();
  return NextResponse.json({ assets });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario || !["ADMIN", "SUPERVISOR", "TECNICO"].includes(usuario.cargo)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const formData = await req.formData();
  const nome = String(formData.get("nome") ?? "").trim();
  const codigo = String(formData.get("codigo") ?? "").trim();
  const isAsicModel = formData.get("isAsicModel") === "true";
  const checklistItemIds = normalizeChecklistItemIds(
    formData.getAll("checklistItemIds").map((v) => String(v))
  );
  const file = formData.get("file") as File | null;

  if (!nome) return NextResponse.json({ error: "Nome do ativo é obrigatório" }, { status: 400 });
  if (!codigo) return NextResponse.json({ error: "Código do ativo é obrigatório" }, { status: 400 });

  if (file) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Foto do ativo deve ser imagem JPG, PNG, WEBP ou GIF" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Imagem muito grande (máx. 10 MB)" }, { status: 400 });
    }
  }

  const assetId = randomAssetId();
  let fotoUrl: string | null = null;

  if (file) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const upload = await uploadFotoAsset({
      assetId,
      file: bytes,
      filename: file.name,
      contentType: file.type,
    });
    fotoUrl = upload.publicUrl;
  }

  const asset = await createAsset({ id: assetId, nome, codigo, fotoUrl, isAsicModel, checklistItemIds });
  return NextResponse.json({ asset }, { status: 201 });
}