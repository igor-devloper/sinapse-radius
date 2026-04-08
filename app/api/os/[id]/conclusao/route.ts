import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { CONCLUSAO_PREFIX, decodeConclusao, encodeConclusao, isConclusaoComentario } from "@/lib/os-conclusao";

const schema = z.object({ texto: z.string().max(4000) });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: osId } = await params;
  const comentario = await prisma.comentario.findFirst({
    where: {
      osId,
      texto: { startsWith: CONCLUSAO_PREFIX },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, texto: true, updatedAt: true },
  });

  return NextResponse.json({
    texto: comentario ? decodeConclusao(comentario.texto) : "",
    updatedAt: comentario?.updatedAt ?? null,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario || !["ADMIN", "SUPERVISOR", "TECNICO"].includes(usuario.cargo)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id: osId } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const texto = parsed.data.texto.trim();

  const existing = await prisma.comentario.findFirst({
    where: {
      osId,
      texto: { startsWith: CONCLUSAO_PREFIX },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (!texto) {
    if (existing) {
      await prisma.comentario.delete({ where: { id: existing.id } });
    }
    return NextResponse.json({ ok: true, texto: "" });
  }

  if (existing) {
    const comentario = await prisma.comentario.update({
      where: { id: existing.id },
      data: { texto: encodeConclusao(texto) },
      select: { id: true, texto: true, updatedAt: true },
    });
    return NextResponse.json({
      ok: true,
      comentario: {
        ...comentario,
        texto: decodeConclusao(comentario.texto),
      },
    });
  }

  const comentario = await prisma.comentario.create({
    data: {
      osId,
      usuarioId: usuario.id,
      texto: encodeConclusao(texto),
    },
    select: { id: true, texto: true, updatedAt: true },
  });

  if (isConclusaoComentario(comentario.texto)) {
    return NextResponse.json({
      ok: true,
      comentario: {
        ...comentario,
        texto: decodeConclusao(comentario.texto),
      },
    });
  }

  return NextResponse.json({ ok: true });
}

