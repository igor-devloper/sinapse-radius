"use client";

import { useState } from "react";
import {
  CheckCircle2, Circle, AlertTriangle, MinusCircle,
  ChevronDown, ChevronUp, MessageSquare, BookOpen, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { INSTRUCOES_MANUAL } from "@/lib/checklist-preventiva";
import { toast } from "sonner";

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
}

const STATUS_CONFIG: Record<StatusItem, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  PENDENTE:       { label: "Pendente",  icon: Circle,        color: "text-gray-400",   bg: "bg-gray-50",    border: "border-gray-200" },
  OK:             { label: "OK",        icon: CheckCircle2,  color: "text-green-600",  bg: "bg-green-50",   border: "border-green-200" },
  NAO_APLICAVEL:  { label: "N/A",       icon: MinusCircle,   color: "text-gray-400",   bg: "bg-gray-50",    border: "border-gray-200" },
  REQUER_ATENCAO: { label: "Atenção",   icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50",  border: "border-orange-200" },
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

// ─── Modal de instruções do manual ───────────────────────────────────────────
function ModalInstrucoes({
  itemId,
  descricao,
  onClose,
}: {
  itemId: string;
  descricao: string;
  onClose: () => void;
}) {
  const instrucoes = INSTRUCOES_MANUAL[itemId];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#8B1FA9" }}>
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">Manual §{instrucoes ? instrucoes.titulo.split("(§")[1]?.replace(")", "") : "—"}</p>
              <p className="text-sm font-semibold text-gray-900 leading-tight">{descricao}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Conteúdo */}
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

        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-400 text-center">
            Manual ANTSPACE HK3 V6 · Radius Mining
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function ChecklistPreventiva({
  osId,
  items: inicial,
  canEdit,
}: {
  osId: string;
  items: ChecklistItem[];
  canEdit: boolean;
}) {
  const [items, setItems] = useState(inicial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [obsEdit, setObsEdit] = useState<Record<string, string>>({});
  const [modalItemId, setModalItemId] = useState<string | null>(null);
  const [modalDescricao, setModalDescricao] = useState<string>("");

  // Stats
  const total = items.length;
  const ok = items.filter((i) => i.status === "OK").length;
  const atencao = items.filter((i) => i.status === "REQUER_ATENCAO").length;
  const pct = total > 0 ? Math.round((ok / total) * 100) : 0;

  // Agrupar por subsistema
  const porSubsistema = items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    (acc[item.subsistema] ??= []).push(item);
    return acc;
  }, {});

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
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
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
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
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

  return (
    <>
      {/* Modal de instruções */}
      {modalItemId && (
        <ModalInstrucoes
          itemId={modalItemId}
          descricao={modalDescricao}
          onClose={() => setModalItemId(null)}
        />
      )}

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

        {/* Itens agrupados por subsistema */}
        <div className="divide-y divide-gray-50">
          {Object.entries(porSubsistema).map(([subsistema, subitems]) => (
            <div key={subsistema}>
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
                          {/* Botão "Como fazer" */}
                          {temInstrucoes && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalItemId(item.itemId);
                                setModalDescricao(item.descricao);
                              }}
                              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors border border-purple-200"
                            >
                              <BookOpen className="w-3 h-3" />
                              Como fazer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandido — ações + observação */}
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
      </div>
    </>
  );
}