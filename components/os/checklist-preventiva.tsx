"use client";

import { useState } from "react";
import {
  CheckCircle2, Circle, AlertTriangle, MinusCircle,
  ChevronDown, ChevronUp, MessageSquare, BookOpen, Package2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { INSTRUCOES_MANUAL } from "@/lib/checklist-preventiva";
import { toast } from "sonner";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import { MinerChecklist } from "@/components/os/miner-checklist";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type StatusItem = "PENDENTE" | "OK" | "NAO_APLICAVEL" | "REQUER_ATENCAO";

interface ChecklistItem {
  id: string;
  itemId: string;
  descricao: string;
  periodicidade: string;
  subsistema: string;
  referencia: string;
  status: StatusItem;
  observacao?: string | null;
  asset?: {
    nome?: string | null;
    codigo?: string | null;
    fotoUrl?: string | null;
  } | null;
}

// ─── Separação miner × preventiva ────────────────────────────────────────────

/**
 * Identifica se um item pertence ao checklist de miners.
 * Critério: itemId começa com "M-" (ex: M-001, M-002, M-003…)
 */
export function isMinerItem(item: ChecklistItem): boolean {
  return item.itemId.startsWith("M-");
}

/**
 * Separa os itens do checklist em dois grupos:
 * - minerItems  → itens de miner (prefixo "M-")
 * - otherItems  → todos os demais itens preventivos
 */
export function splitChecklistItems(items: ChecklistItem[]): {
  minerItems: ChecklistItem[];
  otherItems: ChecklistItem[];
} {
  return {
    minerItems: items.filter(isMinerItem),
    otherItems: items.filter((item) => !isMinerItem(item)),
  };
}

// ─── Configs visuais ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  StatusItem,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  PENDENTE:       { label: "Pendente",  icon: Circle,        color: "text-gray-400",   bg: "bg-gray-50",   border: "border-gray-200"  },
  OK:             { label: "OK",        icon: CheckCircle2,  color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200"  },
  NAO_APLICAVEL:  { label: "N/A",       icon: MinusCircle,   color: "text-gray-400",   bg: "bg-gray-50",   border: "border-gray-200"  },
  REQUER_ATENCAO: { label: "Atenção",   icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
};

const PERIODICIDADE_COLOR: Record<string, string> = {
  "Mensal":          "bg-violet-100 text-violet-700",
  "2 meses":         "bg-amber-100 text-amber-700",
  "Trimestral":      "bg-purple-100 text-purple-700",
  "Semestral":       "bg-fuchsia-100 text-fuchsia-700",
  "Anual":           "bg-emerald-100 text-emerald-700",
  "A cada 1-2 anos": "bg-teal-100 text-teal-700",
  "Diário":          "bg-red-100 text-red-700",
  "2× ao dia":       "bg-red-100 text-red-700",
  "Semanal":         "bg-orange-100 text-orange-700",
  "A cada 2.000 h":  "bg-yellow-100 text-yellow-700",
};

// ─── Overlay escuro padronizado ───────────────────────────────────────────────

function DarkOverlay() {
  return <DialogOverlay className="bg-black/70 backdrop-blur-sm" />;
}

// ─── Dialog: Como fazer ───────────────────────────────────────────────────────

interface ManualDialogItem {
  itemId: string;
  descricao: string;
}

function DialogComoFazer({
  item,
  onClose,
}: {
  item: ManualDialogItem | null;
  onClose: () => void;
}) {
  const instrucoes = item ? INSTRUCOES_MANUAL[item.itemId] : null;

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DarkOverlay />
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl">
          {/* Header */}
          <DialogHeader className="flex-row items-center gap-3 p-5 border-b border-gray-100 space-y-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "#8B1FA9" }}
            >
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">
                Manual §{instrucoes ? instrucoes.titulo.split("(§")[1]?.replace(")", "") : "—"}
              </p>
              <DialogTitle className="text-sm font-semibold text-gray-900 leading-tight">
                {item?.descricao}
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* Passos */}
          <div className="flex-1 overflow-y-auto p-5">
            {instrucoes ? (
              <ol className="space-y-3">
                {instrucoes.passos.map((passo, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                      style={{ background: "#8B1FA9" }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed">{passo}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Instruções não disponíveis para este item.</p>
                <p className="text-xs text-gray-400 mt-1">Consulte o Manual ANTSPACE HK3 V6, seção 9.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400 text-center">Manual ANTSPACE HK3 V6 · Radius Mining</p>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

// ─── Dialog: Ativo do item ────────────────────────────────────────────────────

function DialogAtivo({
  item,
  onClose,
}: {
  item: ChecklistItem | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DarkOverlay />
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                <Package2 className="w-4 h-4 text-violet-600" />
              </div>
              <DialogTitle className="text-sm font-semibold text-gray-800">Ativo do item</DialogTitle>
            </div>
            <DialogDescription className="sr-only">
              Detalhes do ativo associado a este item do checklist.
            </DialogDescription>
          </DialogHeader>

          {item?.asset && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
                  {item.asset.fotoUrl ? (
                    <Image
                      src={item.asset.fotoUrl}
                      alt={item.asset.nome ?? "Ativo"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-gray-400 text-center leading-tight px-1">
                      Sem foto
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Nome</p>
                  <p className="text-sm font-semibold text-gray-900">{item.asset.nome ?? "—"}</p>
                  {item.asset.codigo && (
                    <>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mt-2">Código</p>
                      <p className="text-xs font-mono text-gray-700">{item.asset.codigo}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="rounded-xl bg-violet-50 border border-violet-100 px-3 py-2">
                <p className="text-[10px] text-violet-500 font-semibold uppercase tracking-wide mb-0.5">Item do checklist</p>
                <p className="text-xs text-violet-800 leading-snug">{item.descricao}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

// ─── Bloco de itens por subsistema ────────────────────────────────────────────

function ChecklistItemList({
  items,
  canEdit,
  osId,
  onItemsChange,
}: {
  items: ChecklistItem[];
  canEdit: boolean;
  osId: string;
  onItemsChange: (updatedItem: ChecklistItem) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [obsEdit, setObsEdit] = useState<Record<string, string>>({});
  const [manualItem, setManualItem] = useState<ManualDialogItem | null>(null);
  const [ativoItem, setAtivoItem] = useState<ChecklistItem | null>(null);

  async function atualizarStatus(item: ChecklistItem, novoStatus: StatusItem) {
    setSaving(item.id);
    try {
      const obs = obsEdit[item.id] ?? item.observacao ?? "";
      const res = await fetch(`/api/os/${osId}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, status: novoStatus, observacao: obs }),
      });
      if (res.ok) {
        const { item: updated } = await res.json();
        onItemsChange(updated);
        if (novoStatus === "OK") toast.success("Item marcado como OK");
        if (novoStatus === "REQUER_ATENCAO") toast.warning("Item marcado como Atenção");
      } else {
        toast.error("Erro ao atualizar item");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSaving(null);
    }
  }

  async function salvarObservacao(item: ChecklistItem) {
    setSaving(item.id);
    try {
      const res = await fetch(`/api/os/${osId}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, status: item.status, observacao: obsEdit[item.id] ?? "" }),
      });
      if (res.ok) {
        const { item: updated } = await res.json();
        onItemsChange(updated);
        setObsEdit((prev) => { const n = { ...prev }; delete n[item.id]; return n; });
        toast.success("Observação salva");
      } else {
        toast.error("Erro ao salvar observação");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSaving(null);
    }
  }

  // Agrupa por subsistema mantendo a ordem de inserção
  const porSubsistema = items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    (acc[item.subsistema] ??= []).push(item);
    return acc;
  }, {});

  return (
    <>
      <DialogComoFazer item={manualItem} onClose={() => setManualItem(null)} />
      <DialogAtivo item={ativoItem} onClose={() => setAtivoItem(null)} />

      <div className="divide-y divide-gray-50">
        {Object.entries(porSubsistema).map(([subsistema, subitems]) => (
          <div key={subsistema}>
            {/* Cabeçalho do subsistema */}
            <div className="px-5 py-2 bg-gray-50/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{subsistema}</span>
              <span className="text-xs text-gray-400">
                {subitems.filter((i) => i.status === "OK").length}/{subitems.length}
              </span>
            </div>

            {subitems.map((item) => {
              const s = STATUS_CONFIG[item.status];
              const Icon = s.icon;
              const isExpanded = expanded === item.id;
              const temInstrucoes = !!INSTRUCOES_MANUAL[item.itemId];
              const temAtivo = !!item.asset?.nome;

              return (
                <div key={item.id} className={cn("transition-colors", s.bg)}>
                  <div className="px-5 py-3 flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      <Icon className={cn("w-5 h-5", s.color)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm leading-snug", item.status === "OK" ? "line-through text-gray-400" : "text-gray-800")}>
                          <span className="font-mono text-xs text-gray-400 mr-1">{item.itemId}</span>
                          {item.descricao}
                        </p>
                        <button
                          onClick={() => setExpanded(isExpanded ? null : item.id)}
                          className="p-1 hover:bg-white/60 rounded-lg transition-colors shrink-0"
                        >
                          {isExpanded
                            ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                            : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                        </button>
                      </div>

                      {/* Pills de metadata */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", PERIODICIDADE_COLOR[item.periodicidade] ?? "bg-gray-100 text-gray-600")}>
                          {item.periodicidade}
                        </span>
                        <span className="text-xs text-gray-400">{item.referencia}</span>

                        {item.observacao && (
                          <span className="flex items-center gap-0.5 text-xs text-gray-400">
                            <MessageSquare className="w-3 h-3" />obs
                          </span>
                        )}

                        {temInstrucoes && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setManualItem({ itemId: item.itemId, descricao: item.descricao });
                            }}
                            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors border border-purple-200"
                          >
                            <BookOpen className="w-3 h-3" />
                            Como fazer
                          </button>
                        )}

                        {temAtivo && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAtivoItem(item);
                            }}
                            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors border border-violet-200"
                          >
                            <Package2 className="w-3 h-3" />
                            {item.asset!.nome}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandido — status + observação */}
                  {isExpanded && (
                    <div className="px-5 pb-4 ml-8 space-y-3">
                      {canEdit && (
                        <div className="flex gap-2 flex-wrap">
                          {(Object.entries(STATUS_CONFIG) as [StatusItem, typeof STATUS_CONFIG[StatusItem]][]).map(([st, cfg]) => {
                            const Ic = cfg.icon;
                            return (
                              <button
                                key={st}
                                disabled={saving === item.id}
                                onClick={() => atualizarStatus(item, st)}
                                className={cn(
                                  "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-medium",
                                  item.status === st
                                    ? `${cfg.bg} ${cfg.color} ${cfg.border} shadow-sm`
                                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                                )}
                              >
                                <Ic className="w-3.5 h-3.5" />
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div>
                        <p className="text-xs text-gray-400 mb-1">Observação do técnico</p>
                        {canEdit ? (
                          <div className="flex gap-2">
                            <textarea
                              rows={2}
                              value={obsEdit[item.id] ?? item.observacao ?? ""}
                              onChange={(e) => setObsEdit((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder="Descreva o que foi observado, valores medidos, anomalias..."
                              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                            />
                            {item.id in obsEdit && (
                              <button
                                disabled={saving === item.id}
                                onClick={() => salvarObservacao(item)}
                                className="px-3 py-1.5 text-xs font-medium text-white rounded-xl disabled:opacity-50"
                                style={{ background: "#8B1FA9" }}
                              >
                                Salvar
                              </button>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 italic">
                            {item.observacao || <span className="text-gray-400">Sem observação</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface ChecklistPreventivaProps {
  osId: string;
  items: ChecklistItem[];
  /** true se o usuário tem permissão E a OS não está concluída */
  canEdit: boolean;
  /** true se a OS possui miners associados */
  hasMinerChecklist?: boolean;
  asicAssetId?: string | null;
  containerId?: string | null;
}

export function ChecklistPreventiva({
  osId,
  items: inicial,
  canEdit,
  hasMinerChecklist = false,
  asicAssetId,
  containerId,
}: ChecklistPreventivaProps) {
  const [items, setItems] = useState(inicial);

  // Separa itens de miner dos demais
  const { minerItems, otherItems } = splitChecklistItems(items);

  // Se há miners → exibe só otherItems no preventivo; senão exibe tudo
  const preventivoItems = hasMinerChecklist ? otherItems : items;

  const total   = preventivoItems.length;
  const ok      = preventivoItems.filter((i) => i.status === "OK").length;
  const atencao = preventivoItems.filter((i) => i.status === "REQUER_ATENCAO").length;
  const pct     = total > 0 ? Math.round((ok / total) * 100) : 0;

  function handleItemUpdate(updated: ChecklistItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  return (
    <div className="space-y-5">
      {/* ── Verificação de Miners (renderizada aqui quando pertinente) ─── */}
      {hasMinerChecklist && (
        <div className="bg-white rounded-2xl border border-cyan-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-cyan-50 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
              {/* Cpu icon inline para evitar import extra no preventiva */}
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" />
                <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-800">Verificação de Miners</h3>
              {containerId && (
                <p className="text-xs text-gray-400 font-mono mt-0.5">{containerId}</p>
              )}
            </div>
          </div>
          <div className="p-5">
            <MinerChecklist
              osId={osId}
              assetId={asicAssetId ?? undefined}
              containerId={containerId ?? undefined}
              readOnly={!canEdit}
            />
          </div>
        </div>
      )}

      {/* ── Checklist Preventivo ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header com progresso */}
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Checklist Preventivo</h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-green-600 font-semibold">{ok}/{total} OK</span>
              {atencao > 0 && <span className="text-orange-600 font-semibold">{atencao} atenção</span>}
              <span className="text-gray-400">{pct}%</span>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: pct === 100 ? "#16a34a" : atencao > 0 ? "#ea580c" : "#8B1FA9",
              }}
            />
          </div>
        </div>

        {preventivoItems.length > 0 ? (
          <ChecklistItemList
            items={preventivoItems}
            canEdit={canEdit}
            osId={osId}
            onItemsChange={handleItemUpdate}
          />
        ) : (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            Nenhum item preventivo para exibir.
          </div>
        )}
      </div>
    </div>
  );
}