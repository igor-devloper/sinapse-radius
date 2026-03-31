import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const db = prisma as any;

/**
 * GET /api/os/[id]/miner-checks
 *
 * Retorna todos os MinerCheckOS vinculados a esta OS.
 * Usado pelo componente MinerChecklist para carregar o estado salvo.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: osId } = await params;

  const checks = await db.minerCheckOS.findMany({
    where: { osId },
    include: {
      minerInstance: {
        select: { id: true, serialNumber: true, containerId: true, status: true, assetId: true },
      },
    },
    orderBy: [
      { minerInstance: { containerId: "asc" } },
      { minerInstance: { serialNumber: "asc" } },
    ],
  });

  return NextResponse.json({ checks });
}

/**
 * PUT /api/os/[id]/miner-checks
 *
 * Upsert em massa dos checks de miners de uma OS.
 * Recebe array de { minerInstanceId, status, observacao }.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const usuario = await db.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario || !["ADMIN", "SUPERVISOR", "TECNICO"].includes(usuario.cargo)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id: osId } = await params;

  // Garante que a OS existe
  const os = await db.ordemServico.findUnique({ where: { id: osId }, select: { id: true } });
  if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });

  const body = await req.json();
  const schema = z
    .array(
      z.object({
        minerInstanceId: z.string(),
        status: z.enum(["FUNCIONANDO", "OFFLINE", "COM_FALHA"]),
        observacao: z.string().optional().nullable(),
      })
    )
    .min(1)
    .max(500);

  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });

  const now = new Date();

  await Promise.all(
    parsed.data.map((row) =>
      db.minerCheckOS.upsert({
        where: {
          osId_minerInstanceId: { osId, minerInstanceId: row.minerInstanceId },
        },
        update: {
          status: row.status,
          observacao: row.observacao ?? null,
          atualizadoPorId: usuario.id,
          atualizadoEm: now,
        },
        create: {
          osId,
          minerInstanceId: row.minerInstanceId,
          status: row.status,
          observacao: row.observacao ?? null,
          atualizadoPorId: usuario.id,
          atualizadoEm: now,
        },
      })
    )
  );

  return NextResponse.json({ ok: true });
}