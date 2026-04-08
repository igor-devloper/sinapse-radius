"use client";

import { useState } from "react";
import {
  CheckCircle2, Circle, AlertTriangle, MinusCircle,
  ChevronDown, ChevronUp, MessageSquare, BookOpen, Package2,
  Camera, X, Loader2,
  BookOpenCheck,
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

type StatusItem = "PENDENTE" | "CONFORME" | "NAO_APLICAVEL" | "NAO_CONFORME" | "CONFORME_COM_RESSALVAS";

interface AnexoFoto {
  id: string;
  nome: string;
  url: string;
  tipo: string;
}

// Suporte a um único asset legado OU array de assets
interface AssetInfo {
  nome?: string | null;
  codigo?: string | null;
  fotoUrl?: string | null;
}

interface ChecklistItem {
  id: string;
  itemId: string;
  descricao: string;
  periodicidade: string;
  subsistema: string;
  referencia: string;
  status: StatusItem;
  observacao?: string | null;
  fotos?: AnexoFoto[];
  // Suporte a múltiplos ativos por item
  assets?: AssetInfo[] | null;
  // Legado — item com um único ativo
  asset?: AssetInfo | null;
}

// ─── Helper: normaliza para sempre retornar um array de assets ───────────────

function getAssets(item: ChecklistItem): AssetInfo[] {
  if (item.assets && item.assets.length > 0) return item.assets;
  if (item.asset?.nome) return [item.asset];
  return [];
}

// ─── Separação miner × preventiva ────────────────────────────────────────────

export function isMinerItem(item: ChecklistItem): boolean {
  return item.itemId.startsWith("M-");
}

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
  PENDENTE:               { label: "Pendente",                icon: Circle,        color: "text-gray-400",   bg: "bg-gray-50",   border: "border-gray-200"  },
  CONFORME:               { label: "Conforme",                icon: CheckCircle2,  color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200"  },
  NAO_APLICAVEL:          { label: "N/A",                     icon: MinusCircle,   color: "text-gray-400",   bg: "bg-gray-50",   border: "border-gray-200"  },
  NAO_CONFORME:           { label: "Não conforme",            icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  CONFORME_COM_RESSALVAS: { label: "Conforme com ressalvas",  icon: BookOpenCheck, color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200"  },
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

          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400 text-center">Manual ANTSPACE HK3 V6 · Radius Mining</p>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

// ─── Dialog: Todos os ativos do checklist ─────────────────────────────────────

function DialogAtivos({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: ChecklistItem[];
}) {
  const [fotoExpandida, setFotoExpandida] = useState<{ url: string; nome: string } | null>(null);

  // Deduplica ativos por nome, acumula os itens relacionados.
  // getAssets() normaliza tanto `assets[]` quanto `asset` legado.
  const ativosMap = items.reduce<
    Record<string, { asset: AssetInfo; itens: ChecklistItem[] }>
  >((acc, item) => {
    for (const asset of getAssets(item)) {
      if (!asset.nome) continue;
      const key = asset.nome;
      if (!acc[key]) acc[key] = { asset, itens: [] };
      // Não duplica o mesmo item para o mesmo ativo
      if (!acc[key].itens.find((i) => i.id === item.id)) {
        acc[key].itens.push(item);
      }
    }
    return acc;
  }, {});

  const ativos = Object.values(ativosMap);

  return (
    <>
      {/* Foto expandida */}
      <Dialog open={!!fotoExpandida} onOpenChange={(open) => !open && setFotoExpandida(null)}>
        <DialogPortal>
          <DialogOverlay className="bg-black/90 backdrop-blur-md" />
          <DialogContent className="max-w-3xl w-full p-0 bg-transparent border-0 shadow-none">
            <DialogTitle className="sr-only">Foto expandida</DialogTitle>
            <DialogDescription className="sr-only">Visualização ampliada da foto do ativo</DialogDescription>
            {fotoExpandida && (
              <div className="relative w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/anexo?src=${encodeURIComponent(fotoExpandida.url)}&inline=1`}
                  alt={fotoExpandida.nome}
                  className="w-full max-h-[80vh] object-contain rounded-2xl"
                />
                <p className="text-center text-white/60 text-xs mt-3">{fotoExpandida.nome}</p>
              </div>
            )}
          </DialogContent>
        </DialogPortal>
      </Dialog>

      {/* Modal principal */}
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogPortal>
          <DarkOverlay />
          <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl">
            {/* Header */}
            <DialogHeader className="flex-row items-center gap-3 p-5 border-b border-gray-100 space-y-0 shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-violet-100">
                <Package2 className="w-4 h-4 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-sm font-semibold text-gray-900">
                  Ativos do Checklist
                </DialogTitle>
                <p className="text-xs text-gray-400 mt-0.5">
                  {ativos.length} ativo{ativos.length !== 1 ? "s" : ""} encontrado{ativos.length !== 1 ? "s" : ""}
                </p>
              </div>
            </DialogHeader>

            {/* Lista de ativos */}
            <div className="flex-1 overflow-y-auto">
              {ativos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <Package2 className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">Nenhum ativo vinculado a este checklist.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {ativos.map(({ asset, itens }) => (
                    <div key={asset.nome} className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Foto do ativo — clicável para expandir */}
                        <button
                          type="button"
                          onClick={() =>
                            asset.fotoUrl &&
                            setFotoExpandida({ url: asset.fotoUrl, nome: asset.nome ?? "Ativo" })
                          }
                          className={cn(
                            "relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shrink-0 transition-all",
                            asset.fotoUrl
                              ? "cursor-zoom-in hover:ring-2 hover:ring-violet-400 hover:border-violet-300"
                              : "cursor-default"
                          )}
                        >
                          {asset.fotoUrl ? (
                            <>
                              <Image
                                src={asset.fotoUrl}
                                alt={asset.nome ?? "Ativo"}
                                fill
                                className="object-cover"
                                unoptimized
                                sizes="80px"
                              />
                              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 drop-shadow"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                                </svg>
                              </div>
                            </>
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-gray-400 text-center leading-tight px-1">
                              Sem foto
                            </div>
                          )}
                        </button>

                        {/* Info do ativo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{asset.nome}</p>
                              {asset.codigo && (
                                <p className="text-xs font-mono text-gray-500 mt-0.5">{asset.codigo}</p>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 shrink-0">
                              {itens.length} item{itens.length !== 1 ? "ns" : ""}
                            </span>
                          </div>

                          {/* Tags dos itens vinculados com status colorido */}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {itens.map((item) => (
                              <span
                                key={item.id}
                                className={cn(
                                  "text-[11px] px-2 py-0.5 rounded-full border font-medium",
                                  STATUS_CONFIG[item.status].bg,
                                  STATUS_CONFIG[item.status].color,
                                  STATUS_CONFIG[item.status].border
                                )}
                              >
                                {item.itemId} · {item.descricao.length > 40
                                  ? item.descricao.slice(0, 40) + "…"
                                  : item.descricao}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <p className="text-xs text-gray-400 text-center">
                Clique na foto para expandir · {items.length} item{items.length !== 1 ? "ns" : ""} no checklist
              </p>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
}

// ─── Bloco de itens por subsistema ────────────────────────────────────────────

function ChecklistItemList({
  items,
  canEdit,
  osId,
  onItemsChange,
  onOpenAtivos,
}: {
  items: ChecklistItem[];
  canEdit: boolean;
  osId: string;
  onItemsChange: (updatedItem: ChecklistItem) => void;
  onOpenAtivos: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [obsEdit, setObsEdit] = useState<Record<string, string>>({});
  const [manualItem, setManualItem] = useState<ManualDialogItem | null>(null);

  // ── Fotos por item ───────────────────────────────────────────────────
  const [fotosMap, setFotosMap] = useState<Record<string, AnexoFoto[]>>(() =>
    items.reduce<Record<string, AnexoFoto[]>>((acc, item) => {
      acc[item.id] = item.fotos ?? [];
      return acc;
    }, {})
  );
  const [uploadingFoto, setUploadingFoto] = useState<string | null>(null);
  const [deletingFoto, setDeletingFoto] = useState<string | null>(null);

  async function handleFotoUpload(item: ChecklistItem, file: File) {
    setUploadingFoto(item.id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/os/${osId}/checklist/${item.id}/anexos`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        const { anexo } = await res.json();
        setFotosMap((prev) => ({
          ...prev,
          [item.id]: [...(prev[item.id] ?? []), anexo],
        }));
        toast.success("Foto adicionada");
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Erro ao enviar foto");
      }
    } catch {
      toast.error("Erro de conexão ao enviar foto");
    } finally {
      setUploadingFoto(null);
    }
  }

  async function handleFotoDelete(item: ChecklistItem, anexoId: string) {
    setDeletingFoto(anexoId);
    try {
      const res = await fetch(
        `/api/os/${osId}/checklist/${item.id}/anexos?anexoId=${anexoId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setFotosMap((prev) => ({
          ...prev,
          [item.id]: (prev[item.id] ?? []).filter((f) => f.id !== anexoId),
        }));
        toast.success("Foto removida");
      } else {
        toast.error("Erro ao remover foto");
      }
    } catch {
      toast.error("Erro de conexão ao remover foto");
    } finally {
      setDeletingFoto(null);
    }
  }

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
        if (novoStatus === "CONFORME") toast.success("Item marcado como Conforme");
        if (novoStatus === "NAO_CONFORME") toast.warning("Item marcado como Não conforme");
        if (novoStatus === "CONFORME_COM_RESSALVAS") toast.warning("Item marcado como Conforme com ressalvas");
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

      <div className="divide-y divide-gray-50">
        {Object.entries(porSubsistema).map(([subsistema, subitems]) => (
          <div key={subsistema}>
            {/* Cabeçalho do subsistema */}
            <div className="px-5 py-2 bg-gray-50/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{subsistema}</span>
              <span className="text-xs text-gray-400">
                {subitems.filter((i) => i.status === "CONFORME").length}/{subitems.length}
              </span>
            </div>

            {subitems.map((item) => {
              const s = STATUS_CONFIG[item.status];
              const Icon = s.icon;
              const isExpanded = expanded === item.id;
              const temInstrucoes = !!INSTRUCOES_MANUAL[item.itemId];
              const itemAssets = getAssets(item);
              const temAtivos = itemAssets.length > 0;

              return (
                <div key={item.id} className={cn("transition-colors", s.bg)}>
                  <div className="px-5 py-3 flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      <Icon className={cn("w-5 h-5", s.color)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm leading-snug", item.status === "CONFORME" ? "line-through text-gray-400" : "text-gray-800")}>
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

                        {/* Indicador de fotos */}
                        {(fotosMap[item.id] ?? []).length > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-blue-500 font-medium">
                            <Camera className="w-3 h-3" />
                            {(fotosMap[item.id] ?? []).length} foto{(fotosMap[item.id] ?? []).length > 1 ? "s" : ""}
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

                        {/* Badge de ativos — clicável, abre DialogAtivos com TODOS os ativos do checklist */}
                        {temAtivos && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenAtivos();
                            }}
                            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors border border-violet-200 cursor-pointer"
                          >
                            <Package2 className="w-3 h-3" />
                            {itemAssets.length === 1
                              ? itemAssets[0].nome
                              : `${itemAssets.length} ativos`}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandido — status + observação + fotos */}
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

                      {/* ── Fotos do item ─────────────────────────────────────── */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-gray-400">
                            Fotos do item
                            {(fotosMap[item.id] ?? []).length > 0 && (
                              <span className="ml-1 text-blue-500 font-medium">
                                ({(fotosMap[item.id] ?? []).length})
                              </span>
                            )}
                          </p>
                          {canEdit && (
                            <label
                              className={cn(
                                "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-all font-medium",
                                uploadingFoto === item.id
                                  ? "opacity-50 pointer-events-none bg-gray-50 text-gray-400 border-gray-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                              )}
                            >
                              {uploadingFoto === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Camera className="w-3.5 h-3.5" />
                              )}
                              {uploadingFoto === item.id ? "Enviando..." : "Adicionar foto"}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="sr-only"
                                disabled={uploadingFoto === item.id}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFotoUpload(item, file);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          )}
                        </div>

                        {(fotosMap[item.id] ?? []).length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {(fotosMap[item.id] ?? []).map((foto) => (
                              <div
                                key={foto.id}
                                className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-square"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={`/api/files/anexo?src=${encodeURIComponent(foto.url)}&filename=${encodeURIComponent(foto.nome)}&inline=1`}
                                  alt={foto.nome}
                                  className="w-full h-full object-cover"
                                />
                                {canEdit && (
                                  <button
                                    disabled={deletingFoto === foto.id}
                                    onClick={() => handleFotoDelete(item, foto.id)}
                                    className={cn(
                                      "absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center transition-all",
                                      "bg-black/60 text-white opacity-0 group-hover:opacity-100",
                                      deletingFoto === foto.id && "opacity-100"
                                    )}
                                  >
                                    {deletingFoto === foto.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <X className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <p className="text-white text-[9px] truncate">{foto.nome}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Nenhuma foto adicionada.</p>
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
  canEdit: boolean;
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
  const [dialogAtivosOpen, setDialogAtivosOpen] = useState(false);

  // Separa itens de miner dos demais
  const { otherItems } = splitChecklistItems(items);
  const preventivoItems = hasMinerChecklist ? otherItems : items;

  // Contagem de ativos únicos — itera todos os assets de todos os itens
  const totalAtivosUnicos = new Set(
    preventivoItems.flatMap((i) => getAssets(i).map((a) => a.nome).filter(Boolean))
  ).size;

  const total       = preventivoItems.length;
  const ok          = preventivoItems.filter((i) => i.status === "CONFORME").length;
  const atencao     = preventivoItems.filter((i) => i.status === "NAO_CONFORME").length;
  const okRessalvas = preventivoItems.filter((i) => i.status === "CONFORME_COM_RESSALVAS").length;
  const tudo        = preventivoItems.filter((i) => i.status !== "PENDENTE").length;
  const pct         = total > 0 ? Math.round((tudo / total) * 100) : 0;

  void ok;

  function handleItemUpdate(updated: ChecklistItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  return (
    <div className="space-y-5">
      {/* Dialog de todos os ativos — recebe TODOS os itens preventivos */}
      <DialogAtivos
        open={dialogAtivosOpen}
        onClose={() => setDialogAtivosOpen(false)}
        items={preventivoItems}
      />

      {/* ── Verificação de Miners ─────────────────────────────────────── */}
      {hasMinerChecklist && (
        <div className="bg-white rounded-2xl border border-cyan-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-cyan-50 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
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

      {/* ── Checklist Preventivo ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header com progresso */}
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            {/* Título + botão de ativos */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-gray-800">Checklist Preventivo</h3>
              {totalAtivosUnicos > 0 && (
                <button
                  type="button"
                  onClick={() => setDialogAtivosOpen(true)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors border border-violet-200"
                >
                  <Package2 className="w-3 h-3" />
                  {totalAtivosUnicos} ativo{totalAtivosUnicos !== 1 ? "s" : ""}
                </button>
              )}
            </div>

            {/* Stats de progresso */}
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="text-green-600 font-semibold">{tudo}/{total} Verificado</span>
              {atencao > 0 && <span className="text-orange-600 font-semibold">{atencao} atenção</span>}
              {okRessalvas > 0 && <span className="text-blue-600 font-semibold">{okRessalvas} com ressalvas</span>}
              <span className="text-gray-400">{pct}%</span>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background:
                  pct === 100
                    ? "#16a34a"
                    : atencao > 0
                    ? "#ea580c"
                    : okRessalvas > 0
                    ? "#155dfc"
                    : "#8B1FA9",
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
            onOpenAtivos={() => setDialogAtivosOpen(true)}
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