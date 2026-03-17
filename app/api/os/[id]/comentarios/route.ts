import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ texto: z.string().min(1).max(1000) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const comentario = await prisma.comentario.create({
    data: { osId: (await params).id, texto: parsed.data.texto, usuarioId: usuario.id },
    include: { usuario: { select: { id: true, nome: true, avatarUrl: true } } },
  });

  return NextResponse.json({ comentario }, { status: 201 });
}
