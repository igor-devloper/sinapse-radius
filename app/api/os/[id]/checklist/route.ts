import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  itemId:     z.string(),           // id do ChecklistItemOS
  status:     z.enum(["PENDENTE","OK","NAO_APLICAVEL","REQUER_ATENCAO"]),
  observacao: z.string().optional(),
});

// PATCH /api/os/[id]/checklist — atualiza status + obs de um item
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario || !["ADMIN","SUPERVISOR","TECNICO"].includes(usuario.cargo))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { itemId, status, observacao } = parsed.data;

  const item = await (prisma as any).checklistItemOS.update({
    where: { id: itemId },
    data: {
      status,
      observacao: observacao ?? undefined,
      atualizadoPorId: usuario.id,
      atualizadoEm: new Date(),
    },
    include: { asset: { select: { nome: true, codigo: true, fotoUrl: true } } },
  });

  return NextResponse.json({ item });
}