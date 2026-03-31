import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const db = prisma as any;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const usuario = await db.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario || !["ADMIN", "SUPERVISOR", "TECNICO"].includes(usuario.cargo)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const schema = z.object({
    status:      z.enum(["ativo", "inativo", "manutencao"]).optional(),
    containerId: z.string().optional().nullable(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const miner = await db.minerInstance.update({
    where: { id: (await params).id },
    data:  parsed.data,
  }).catch(() => null);

  if (!miner) return NextResponse.json({ error: "Miner não encontrado" }, { status: 404 });
  return NextResponse.json({ miner });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const usuario = await db.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario || !["ADMIN", "SUPERVISOR"].includes(usuario.cargo)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await db.minerInstance.delete({ where: { id: (await params).id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}