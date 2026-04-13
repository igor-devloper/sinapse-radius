import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function verificarAdmin(userId: string) {
  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario || usuario.cargo !== "ADMIN") return null;
  return usuario;
}

// GET /api/admin/usuarios
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const admin = await verificarAdmin(userId);
  if (!admin) return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });

  const usuarios = await prisma.usuario.findMany({
    orderBy: { nome: "asc" },
    include: {
      _count: { select: { ordensResponsavel: true, ordensAberta: true } },
    },
  });

  return NextResponse.json({ usuarios });
}

const atualizarCargoSchema = z.object({
  usuarioId: z.string(),
  cargo: z.enum(["ADMIN", "SUPERVISOR", "TECNICO", "VISUALIZADOR", "ENGENHEIRO"]),
  ativo: z.boolean().optional(),
});

// PATCH /api/admin/usuarios — Atualiza cargo
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const admin = await verificarAdmin(userId);
  if (!admin) return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });

  const body = await req.json();
  const parsed = atualizarCargoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { usuarioId, cargo, ativo } = parsed.data;

  const usuario = await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      ...(cargo && { cargo }),
      ...(ativo !== undefined && { ativo }),
    },
  });

  // Atualiza metadata no Clerk para o middleware funcionar
  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(usuario.clerkId, {
    publicMetadata: { cargo },
  });

  return NextResponse.json({ usuario });
}
