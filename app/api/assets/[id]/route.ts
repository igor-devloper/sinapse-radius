import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  countChecklistUsageByAsset,
  deleteAsset,
  getAssetById,
  normalizeChecklistItemIds,
  updateAsset,
} from "@/lib/assets";
import { uploadFotoAsset } from "@/lib/storageSupabase";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Ctx = { params: Promise<{ id: string }> };

async function getAuthorizedUser() {
  const { userId } = await auth();
  if (!userId) {
    return { error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }), usuario: null };
  }
  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario) {
    return { error: NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 }), usuario: null };
  }
  return { error: null, usuario };
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const authResult = await getAuthorizedUser();
  if (authResult.error) return authResult.error;

  const usuario = authResult.usuario!;
  if (!["ADMIN", "SUPERVISOR", "TECNICO"].includes(usuario.cargo)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const current = await getAssetById(id);
  if (!current) {
    return NextResponse.json({ error: "Ativo não encontrado" }, { status: 404 });
  }

  const formData = await req.formData();
  const nome = String(formData.get("nome") ?? current.nome).trim();
  const codigo = String(formData.get("codigo") ?? current.codigo).trim();
  // Se o campo não vem no form, mantém o valor atual
  const isAsicModelRaw = formData.get("isAsicModel");
  const isAsicModel = isAsicModelRaw !== null ? isAsicModelRaw === "true" : current.isAsicModel;
  const checklistItemIds = normalizeChecklistItemIds(
    formData.getAll("checklistItemIds").map((v) => String(v))
  );
  const file = formData.get("file") as File | null;

  if (!nome) return NextResponse.json({ error: "Nome do ativo é obrigatório" }, { status: 400 });
  if (!codigo) return NextResponse.json({ error: "Código do ativo é obrigatório" }, { status: 400 });

  let fotoUrl = current.fotoUrl;

  if (file && file.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Foto do ativo deve ser imagem JPG, PNG, WEBP ou GIF" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Imagem muito grande (máx. 10 MB)" }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const upload = await uploadFotoAsset({
      assetId: id,
      file: bytes,
      filename: file.name,
      contentType: file.type,
    });
    fotoUrl = upload.publicUrl;
  }

  const asset = await updateAsset({ id, nome, codigo, fotoUrl, isAsicModel, checklistItemIds });
  return NextResponse.json({ asset });
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  const authResult = await getAuthorizedUser();
  if (authResult.error) return authResult.error;

  const usuario = authResult.usuario!;
  if (!["ADMIN", "SUPERVISOR", "TECNICO"].includes(usuario.cargo)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const current = await getAssetById(id);
  if (!current) {
    return NextResponse.json({ error: "Ativo não encontrado" }, { status: 404 });
  }

  const usage = await countChecklistUsageByAsset(id);
  if (usage > 0) {
    return NextResponse.json(
      { error: `Este ativo está vinculado a ${usage} item(ns) de checklist e não pode ser excluído.` },
      { status: 409 }
    );
  }

  await deleteAsset(id);
  return NextResponse.json({ ok: true });
}