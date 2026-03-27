import { prisma } from "@/lib/prisma";

export type AssetRecord = {
  id: string;
  nome: string;
  codigo: string;
  fotoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ChecklistItemWithAsset = {
  id: string;
  osId: string;
  itemId: string;
  descricao: string;
  periodicidade: string;
  subsistema: string;
  referencia: string;
  assetId: string | null;
  status: "PENDENTE" | "OK" | "NAO_APLICAVEL" | "REQUER_ATENCAO";
  observacao: string | null;
  atualizadoPorId: string | null;
  atualizadoEm: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assetNome: string | null;
  assetCodigo: string | null;
  assetFotoUrl: string | null;
};

type PrismaWithAsset = typeof prisma & {
  asset: {
    create: (args: any) => Promise<any>;
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any | null>;
    update: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
  };
  checklistItemOS: {
    findMany: (args?: any) => Promise<any[]>;
    updateMany: (args: any) => Promise<any>;
    count: (args?: any) => Promise<number>;
  };
};

const db = prisma as PrismaWithAsset;

function mapAsset(row: any): AssetRecord {
  return {
    id: String(row.id),
    nome: String(row.nome),
    codigo: String(row.codigo),
    fotoUrl: row.fotoUrl ? String(row.fotoUrl) : null,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
  };
}

function mapChecklistItem(row: any): ChecklistItemWithAsset {
  return {
    id: String(row.id),
    osId: String(row.osId),
    itemId: String(row.itemId),
    descricao: String(row.descricao),
    periodicidade: String(row.periodicidade),
    subsistema: String(row.subsistema),
    referencia: String(row.referencia),
    assetId: row.assetId ? String(row.assetId) : null,
    status: String(row.status) as ChecklistItemWithAsset["status"],
    observacao: row.observacao ? String(row.observacao) : null,
    atualizadoPorId: row.atualizadoPorId ? String(row.atualizadoPorId) : null,
    atualizadoEm: row.atualizadoEm ? new Date(row.atualizadoEm) : null,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
    assetNome: row.asset?.nome ? String(row.asset.nome) : null,
    assetCodigo: row.asset?.codigo ? String(row.asset.codigo) : null,
    assetFotoUrl: row.asset?.fotoUrl ? String(row.asset.fotoUrl) : null,
  };
}

export async function createAsset(args: {
  id: string;
  nome: string;
  codigo: string;
  fotoUrl?: string | null;
}) {
  const created = await db.asset.create({
    data: {
      id: args.id,
      nome: args.nome,
      codigo: args.codigo,
      fotoUrl: args.fotoUrl ?? null,
    },
  });

  return mapAsset(created);
}

export async function listAssets() {
  const rows = await db.asset.findMany({
    orderBy: [{ nome: "asc" }, { codigo: "asc" }],
  });

  return rows.map(mapAsset);
}

export async function getChecklistItemsWithAssets(osId: string) {
  const rows = await db.checklistItemOS.findMany({
    where: { osId },
    include: {
      asset: {
        select: {
          nome: true,
          codigo: true,
          fotoUrl: true,
        },
      },
    },
    orderBy: [{ subsistema: "asc" }, { itemId: "asc" }],
  });

  return rows.map(mapChecklistItem);
}

export async function attachAssetToChecklistItem(args: {
  osId: string;
  itemId: string;
  assetId: string;
  db?: {
    checklistItemOS?: {
      updateMany: (args: any) => Promise<any>;
    };
  };
}) {
  const client = (args.db as PrismaWithAsset | undefined) ?? db;

  if (!client.checklistItemOS?.updateMany) {
    throw new Error("Cliente Prisma inválido para vincular ativo ao checklist.");
  }

  await client.checklistItemOS.updateMany({
    where: {
      osId: args.osId,
      itemId: args.itemId,
    },
    data: {
      assetId: args.assetId,
    },
  });
}

export async function getAssetById(id: string) {
  const row = await db.asset.findUnique({
    where: { id },
  });

  return row ? mapAsset(row) : null;
}

export async function updateAsset(args: {
  id: string;
  nome: string;
  codigo: string;
  fotoUrl?: string | null;
}) {
  const updated = await db.asset.update({
    where: { id: args.id },
    data: {
      nome: args.nome,
      codigo: args.codigo,
      fotoUrl: args.fotoUrl ?? null,
    },
  });

  return mapAsset(updated);
}

export async function countChecklistUsageByAsset(assetId: string) {
  return db.checklistItemOS.count({
    where: { assetId },
  });
}

export async function deleteAsset(assetId: string) {
  await db.asset.delete({
    where: { id: assetId },
  });
}
