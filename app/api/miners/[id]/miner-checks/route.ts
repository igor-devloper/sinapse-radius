import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const db = prisma as any;

/**
 * GET /api/miners/[id]/miner-checks
 *
 * Retorna o histórico de MinerCheckOS de uma MinerInstance específica
 * (todas as OS em que esse miner foi verificado).
 *
 * ATENÇÃO: Este endpoint é de consulta histórica por miner.
 * Para os checks de uma OS específica, use /api/os/[id]/miner-checks.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: minerInstanceId } = await params;

  // Garante que o miner existe
  const miner = await db.minerInstance.findUnique({
    where: { id: minerInstanceId },
    select: { id: true },
  });
  if (!miner) return NextResponse.json({ error: "Miner não encontrado" }, { status: 404 });

  const checks = await db.minerCheckOS.findMany({
    where: { minerInstanceId },
    include: {
      os: {
        select: { id: true, numero: true, titulo: true, status: true, dataProgramada: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ checks });
}

/**
 * PUT /api/miners/[id]/miner-checks
 *
 * Upsert de checks para uma MinerInstance em múltiplas OS.
 * Usado para operações em massa vindas do módulo Mining (histórico).
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

  const { id: minerInstanceId } = await params;

  const body = await req.json();
  const schema = z.array(
    z.object({
      osId:      z.string(),
      status:    z.enum(["FUNCIONANDO", "OFFLINE", "COM_FALHA"]),
      observacao: z.string().optional().nullable(),
    })
  ).min(1).max(500);

  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });

  const now = new Date();

  await Promise.all(
    parsed.data.map((row) =>
      db.minerCheckOS.upsert({
        where: { osId_minerInstanceId: { osId: row.osId, minerInstanceId } },
        update: {
          status:          row.status,
          observacao:      row.observacao ?? null,
          atualizadoPorId: usuario.id,
          atualizadoEm:    now,
        },
        create: {
          osId:            row.osId,
          minerInstanceId,
          status:          row.status,
          observacao:      row.observacao ?? null,
          atualizadoPorId: usuario.id,
          atualizadoEm:    now,
        },
      })
    )
  );

  return NextResponse.json({ ok: true });
}