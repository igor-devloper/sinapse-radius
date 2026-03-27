import { prisma } from "@/lib/prisma";
import { CHECKLIST_POR_ID, findChecklistItemsByIds } from "@/lib/checklist-preventiva";

const db = prisma as any;

export type AssetLinkRecord = {
  checklistItemId: string;
  itemCodigo: string;
  itemDescricao: string;
  itemSubsistema: string;
  itemPeriodicidade: string;
};

export type AssetRecord = {
  id: string;
  nome: string;
  codigo: string;
  fotoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  checklistLinks: AssetLinkRecord[];
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

function toDate(v: any) {
  return v instanceof Date ? v : new Date(v);
}

function mapLink(checklistItemId: string): AssetLinkRecord {
  const item = CHECKLIST_POR_ID[checklistItemId];
  return {
    checklistItemId,
    itemCodigo: item?.id ?? checklistItemId,
    itemDescricao: item?.descricao ?? checklistItemId,
    itemSubsistema: item?.subsistema ?? "Geral",
    itemPeriodicidade: item?.periodicidade ?? "—",
  };
}

function mapAsset(row: any): AssetRecord {
  const bindings = Array.isArray(row.checklistTemplateLinks)
    ? row.checklistTemplateLinks.map((b: any) => mapLink(String(b.checklistItemId)))
    : [];

  return {
    id: String(row.id),
    nome: String(row.nome),
    codigo: String(row.codigo),
    fotoUrl: row.fotoUrl ? String(row.fotoUrl) : null,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
    checklistLinks: bindings.sort((a: { itemCodigo: string; }, b: { itemCodigo: any; }) => a.itemCodigo.localeCompare(b.itemCodigo, "pt-BR")),
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
    atualizadoEm: row.atualizadoEm ? toDate(row.atualizadoEm) : null,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
    assetNome: row.asset?.nome ? String(row.asset.nome) : null,
    assetCodigo: row.asset?.codigo ? String(row.asset.codigo) : null,
    assetFotoUrl: row.asset?.fotoUrl ? String(row.asset.fotoUrl) : null,
  };
}

async function syncAssetTemplateLinks(tx: any, assetId: string, checklistItemIds: string[]) {
  const uniqueIds = Array.from(new Set(checklistItemIds.filter(Boolean)));

  await tx.assetChecklistTemplate.deleteMany({ where: { assetId } });

  if (uniqueIds.length > 0) {
    await tx.assetChecklistTemplate.createMany({
      data: uniqueIds.map((checklistItemId) => ({ assetId, checklistItemId })),
      skipDuplicates: true,
    });
  }
}

export async function createAsset(args: {
  id: string;
  nome: string;
  codigo: string;
  fotoUrl?: string | null;
  checklistItemIds?: string[];
}) {
  const created = await db.$transaction(async (tx: any) => {
    const asset = await tx.asset.create({
      data: {
        id: args.id,
        nome: args.nome,
        codigo: args.codigo,
        fotoUrl: args.fotoUrl ?? null,
      },
      include: { checklistTemplateLinks: true },
    });

    await syncAssetTemplateLinks(tx, asset.id, args.checklistItemIds ?? []);

    return tx.asset.findUnique({
      where: { id: asset.id },
      include: { checklistTemplateLinks: true },
    });
  });

  return mapAsset(created);
}

export async function listAssets() {
  const rows = await db.asset.findMany({
    include: { checklistTemplateLinks: true },
    orderBy: [{ nome: "asc" }, { codigo: "asc" }],
  });

  return rows.map(mapAsset);
}

export async function getAssetById(id: string) {
  const row = await db.asset.findUnique({
    where: { id },
    include: { checklistTemplateLinks: true },
  });

  return row ? mapAsset(row) : null;
}

export async function updateAsset(args: {
  id: string;
  nome: string;
  codigo: string;
  fotoUrl?: string | null;
  checklistItemIds?: string[];
}) {
  const updated = await db.$transaction(async (tx: any) => {
    await tx.asset.update({
      where: { id: args.id },
      data: {
        nome: args.nome,
        codigo: args.codigo,
        fotoUrl: args.fotoUrl ?? null,
      },
    });

    await syncAssetTemplateLinks(tx, args.id, args.checklistItemIds ?? []);

    return tx.asset.findUnique({
      where: { id: args.id },
      include: { checklistTemplateLinks: true },
    });
  });

  return mapAsset(updated);
}

export async function deleteAsset(assetId: string) {
  await db.asset.delete({ where: { id: assetId } });
}

export async function countChecklistUsageByAsset(assetId: string) {
  const [templateUsage, osUsage] = await Promise.all([
    db.assetChecklistTemplate.count({ where: { assetId } }),
    db.checklistItemOS.count({ where: { assetId } }),
  ]);

  return templateUsage + osUsage;
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

export async function getAssetBindingsForChecklistItems(itemIds: string[]) {
  const uniqueIds = Array.from(new Set(itemIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, { assetId: string; assetNome: string | null; assetCodigo: string | null; assetFotoUrl: string | null }>();

  const bindings = await db.assetChecklistTemplate.findMany({
    where: { checklistItemId: { in: uniqueIds } },
    include: {
      asset: {
        select: { id: true, nome: true, codigo: true, fotoUrl: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const map = new Map<string, { assetId: string; assetNome: string | null; assetCodigo: string | null; assetFotoUrl: string | null }>();
  for (const row of bindings) {
    if (!row.asset || map.has(String(row.checklistItemId))) continue;
    map.set(String(row.checklistItemId), {
      assetId: String(row.asset.id),
      assetNome: row.asset.nome ? String(row.asset.nome) : null,
      assetCodigo: row.asset.codigo ? String(row.asset.codigo) : null,
      assetFotoUrl: row.asset.fotoUrl ? String(row.asset.fotoUrl) : null,
    });
  }
  return map;
}

export async function attachAssetToChecklistItem(args: {
  osId: string;
  itemId: string;
  assetId: string;
  db?: any;
}) {
  const client = args.db ?? db;
  await client.checklistItemOS.updateMany({
    where: { osId: args.osId, itemId: args.itemId },
    data: { assetId: args.assetId },
  });
}

export async function listChecklistLinksSummary(assetIds: string[]) {
  const rows = await db.assetChecklistTemplate.findMany({
    where: { assetId: { in: assetIds } },
    select: { assetId: true, checklistItemId: true },
  });

  const grouped = new Map<string, AssetLinkRecord[]>();
  for (const row of rows) {
    const list = grouped.get(String(row.assetId)) ?? [];
    list.push(mapLink(String(row.checklistItemId)));
    grouped.set(String(row.assetId), list);
  }
  return grouped;
}

export function normalizeChecklistItemIds(ids: string[]) {
  const validIds = new Set(findChecklistItemsByIds(ids).map((item) => item.id));
  return Array.from(validIds);
}
