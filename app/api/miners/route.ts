import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET /api/miners?assetId=xxx&containerId=xxx&status=ativo&page=1&limit=50
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const assetId    = searchParams.get("assetId")    ?? undefined;
  const containerId = searchParams.get("containerId") ?? undefined;
  const status     = searchParams.get("status")     ?? undefined;
  const page       = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit      = Math.min(200, parseInt(searchParams.get("limit") ?? "50"));
  const q          = searchParams.get("q")          ?? undefined;

  const where: Record<string, unknown> = {};
  if (assetId)     where.assetId     = assetId;
  if (containerId) where.containerId = containerId;
  if (status)      where.status      = status;
  if (q) {
    where.OR = [
      { serialNumber: { contains: q, mode: "insensitive" } },
      { containerId:  { contains: q, mode: "insensitive" } },
    ];
  }

  const db = prisma as any;
  const [total, miners] = await Promise.all([
    db.minerInstance.count({ where }),
    db.minerInstance.findMany({
      where,
      include: { asset: { select: { id: true, nome: true, codigo: true } } },
      orderBy: [{ containerId: "asc" }, { serialNumber: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ miners, total, page, limit });
}

// POST /api/miners — criar um único miner
const criarMinerSchema = z.object({
  serialNumber: z.string().min(1).max(100),
  assetId:      z.string().min(1),
  containerId:  z.string().optional(),
  status:       z.enum(["ativo", "inativo", "manutencao"]).default("ativo"),
});

// POST /api/miners/bulk — importação em massa (aceita no body)
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const db = prisma as any;
  const usuario = await db.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario || !["ADMIN", "SUPERVISOR"].includes(usuario.cargo)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();

  // Importação em massa: array de miners
  if (Array.isArray(body)) {
    const bulkSchema = z.array(z.object({
      serialNumber: z.string().min(1).max(100),
      assetId:      z.string().min(1),
      containerId:  z.string().optional(),
      status:       z.enum(["ativo", "inativo", "manutencao"]).default("ativo"),
    })).min(1).max(1000);

    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    // Upsert em lotes de 100
    const BATCH = 100;
    for (let i = 0; i < parsed.data.length; i += BATCH) {
      const batch = parsed.data.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (row) => {
          try {
            await db.minerInstance.upsert({
              where:  { serialNumber: row.serialNumber },
              update: { containerId: row.containerId ?? null, assetId: row.assetId, status: row.status },
              create: { serialNumber: row.serialNumber, assetId: row.assetId, containerId: row.containerId ?? null, status: row.status },
            });
            results.created++;
          } catch {
            results.skipped++;
            results.errors.push(row.serialNumber);
          }
        })
      );
    }

    return NextResponse.json({ ok: true, ...results }, { status: 201 });
  }

  // Criação única
  const parsed = criarMinerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  const existing = await db.minerInstance.findUnique({ where: { serialNumber: parsed.data.serialNumber } });
  if (existing) {
    return NextResponse.json({ error: "Serial number já cadastrado" }, { status: 409 });
  }

  const miner = await db.minerInstance.create({ data: parsed.data });
  return NextResponse.json({ miner }, { status: 201 });
}