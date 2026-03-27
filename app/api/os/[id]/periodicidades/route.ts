/**
 * PATCH /api/os/[id]/periodicidades
 * Atualiza as periodicidades selecionadas de uma OS preventiva existente.
 * Regenera o checklist com base nas novas periodicidades.
 *
 * Regra de flexibilidade: o usuário pode editar periodicidades depois de criar a OS.
 * Itens já marcados como OK ou REQUER_ATENCAO são preservados se o item ainda existir.
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { itensPorMultiplasPeriodicidades, PERIODICIDADE_LABEL } from "@/lib/checklist-preventiva";
import { attachAssetToChecklistItem, getChecklistItemsWithAssets } from "@/lib/assets";
import { z } from "zod";

const schema = z.object({
  periodicidadesSelecionadas: z.array(z.enum([
    "DIARIA", "SEMANAL", "MENSAL", "TRIMESTRAL",
    "SEMESTRAL", "ANUAL", "HORAS_2000", "BIENNIAL",
  ])).min(1, "Selecione ao menos uma periodicidade"),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if (!["ADMIN", "SUPERVISOR", "TECNICO"].includes(usuario.cargo))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const os = await prisma.ordemServico.findUnique({
    where: { id },
  });

  if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
  if (os.tipoOS !== "PREVENTIVA")
    return NextResponse.json({ error: "Apenas OS preventivas podem ter periodicidades editadas" }, { status: 400 });
  if (os.status === "CONCLUIDA" || os.status === "CANCELADA")
    return NextResponse.json({ error: "Não é possível editar OS concluída ou cancelada" }, { status: 400 });

  const checklistItemsExistentes = await getChecklistItemsWithAssets(id);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { periodicidadesSelecionadas } = parsed.data;
  const novosItens = itensPorMultiplasPeriodicidades(periodicidadesSelecionadas);
  const novosItemIds = new Set(novosItens.map((i) => i.id));

  // Status dos itens existentes que serão preservados
  const statusExistentes = Object.fromEntries(
    checklistItemsExistentes.map((item: { itemId: any; status: any; observacao: any; assetId: any; }) => [item.itemId, { status: item.status, observacao: item.observacao, assetId: item.assetId }])
  );

  const labelPeriods = periodicidadesSelecionadas.map((p) => PERIODICIDADE_LABEL[p]).join(" + ");

  await prisma.$transaction(async (tx) => {
    // Remove todos os itens do checklist atual
    await tx.checklistItemOS.deleteMany({ where: { osId: id } });

    // Recria com os novos itens, preservando status dos existentes
    if (novosItens.length > 0) {
      await tx.checklistItemOS.createMany({
        data: novosItens.map((item) => {
          const existente = statusExistentes[item.id];
          return {
            osId: id,
            itemId: item.id,
            descricao: item.descricao,
            periodicidade: item.periodicidade,
            subsistema: item.subsistema,
            referencia: item.referencia,
            // Preserva status se item já existia e estava respondido
            status: existente && existente.status !== "PENDENTE" ? existente.status : "PENDENTE",
            observacao: existente?.observacao ?? null,
          };
        }),
      });

      for (const item of novosItens) {
        const assetId = statusExistentes[item.id]?.assetId;
        if (!assetId) continue;
        await attachAssetToChecklistItem({ osId: id, itemId: item.id, assetId, db: tx });
      }
    }

    // Atualiza a OS com as novas periodicidades
    await tx.ordemServico.update({
      where: { id },
      data: {
        periodicidadesSelecionadas: periodicidadesSelecionadas as string[],
        periodicidadePreventiva: periodicidadesSelecionadas[0] as never,
      },
    });

    // Registra no histórico
    await tx.historicoOS.create({
      data: {
        osId: id,
        statusPara: os.status,
        observacao: `Periodicidades atualizadas: ${labelPeriods} (${novosItens.length} itens de checklist)`,
        usuarioId: usuario.id,
      },
    });
  });

  return NextResponse.json({
    ok: true,
    periodicidadesSelecionadas,
    totalItens: novosItens.length,
  });
}