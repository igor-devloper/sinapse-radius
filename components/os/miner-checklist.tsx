"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Cpu, Search, CheckCircle2, WifiOff, AlertTriangle, RotateCw, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type StatusMinerUI = "FUNCIONANDO" | "OFFLINE" | "COM_FALHA" | null;

export interface MinerRow {
  minerInstanceId: string;
  serialNumber: string;
  containerId: string | null;
  currentStatus: StatusMinerUI;
  observacao: string;
}

interface MinerChecklistProps {
  osId: string;
  /**
   * Não são mais usados para buscar miners — mantidos apenas para
   * compatibilidade de chamadas existentes. O componente agora carrega
   * exclusivamente os MinerCheckOS já vinculados à OS.
   */
  assetId?: string;
  containerId?: string;
  readOnly?: boolean;
  onSaveAll?: (rows: MinerRow[]) => void;
}

const STATUS_CONFIG = {
  FUNCIONANDO: {
    label: "Funcionando",
    icon: CheckCircle2,
    bg: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
    activeBg: "bg-emerald-500 border-emerald-600 text-white",
    dot: "bg-emerald-500",
  },
  OFFLINE: {
    label: "Offline",
    icon: WifiOff,
    bg: "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100",
    activeBg: "bg-gray-600 border-gray-700 text-white",
    dot: "bg-gray-400",
  },
  COM_FALHA: {
    label: "Com Falha",
    icon: AlertTriangle,
    bg: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
    activeBg: "bg-red-500 border-red-600 text-white",
    dot: "bg-red-500",
  },
} as const;

function StatusButton({
  status,
  active,
  onClick,
  disabled,
}: {
  status: keyof typeof STATUS_CONFIG;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
        active ? cfg.activeBg : cfg.bg,
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </button>
  );
}

export function MinerChecklist({ osId, readOnly, onSaveAll }: MinerChecklistProps) {
  const [rows, setRows] = useState<MinerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusMinerUI | "all">("all");
  const [expandedObs, setExpandedObs] = useState<Set<string>>(new Set());

  // ── Carrega os MinerCheckOS já vinculados a esta OS ───────────────────────
  // Fonte única de verdade: /api/os/[id]/miner-checks
  // Os registros são criados automaticamente ao abrir a OS (POST /api/os).
  useEffect(() => {
    if (!osId) return;
    setLoading(true);

    fetch(`/api/os/${osId}/miner-checks`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(({ checks }) => {
        setRows(
          (checks ?? []).map((c: any) => ({
            minerInstanceId: c.minerInstanceId,
            serialNumber:    c.minerInstance?.serialNumber ?? c.minerInstanceId,
            containerId:     c.minerInstance?.containerId ?? null,
            currentStatus:   (c.status as StatusMinerUI) ?? null,
            observacao:      c.observacao ?? "",
          }))
        );
      })
      .catch((err) => {
        console.error("[MinerChecklist] Erro ao carregar checks:", err);
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [osId]);

  const setRowStatus = useCallback((id: string, status: StatusMinerUI) => {
    setRows((prev) => prev.map((r) => r.minerInstanceId === id ? { ...r, currentStatus: status } : r));
  }, []);

  const setRowObs = useCallback((id: string, obs: string) => {
    setRows((prev) => prev.map((r) => r.minerInstanceId === id ? { ...r, observacao: obs } : r));
  }, []);

  const toggleObs = useCallback((id: string) => {
    setExpandedObs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const filteredRows = useMemo(() => {
    let filtered = rows;
    if (filterStatus !== "all") {
      filtered = filtered.filter((r) => r.currentStatus === filterStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.serialNumber.toLowerCase().includes(q) ||
          (r.containerId ?? "").toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [rows, filterStatus, search]);

  const stats = useMemo(() => {
    const total       = rows.length;
    const checked     = rows.filter((r) => r.currentStatus !== null).length;
    const funcionando = rows.filter((r) => r.currentStatus === "FUNCIONANDO").length;
    const offline     = rows.filter((r) => r.currentStatus === "OFFLINE").length;
    const falha       = rows.filter((r) => r.currentStatus === "COM_FALHA").length;
    return { total, checked, funcionando, offline, falha };
  }, [rows]);

  const markAllFuncionando = useCallback(() => {
    setRows((prev) =>
      prev.map((r) => r.currentStatus === null ? { ...r, currentStatus: "FUNCIONANDO" } : r)
    );
  }, []);

  async function handleSave() {
    // Salva todos os rows (não apenas os alterados) para garantir consistência
    const toSave = rows;
    if (toSave.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/os/${osId}/miner-checks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          toSave.map((r) => ({
            minerInstanceId: r.minerInstanceId,
            status:          r.currentStatus ?? "FUNCIONANDO",
            observacao:      r.observacao || null,
          }))
        ),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
      onSaveAll?.(toSave);
    } catch (err) {
      console.error("[MinerChecklist] Erro ao salvar:", err);
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
        <RotateCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Carregando miners…</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
        <Cpu className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500 font-medium">Nenhum miner vinculado a esta OS</p>
        <p className="text-xs text-gray-400 mt-1">
          Cadastre miners no módulo Ativos → ASIC com o Container ID correto e reabra a OS.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Total",       value: stats.total,       color: "text-gray-700",    bg: "bg-gray-50 border-gray-200" },
          { label: "Verificados", value: stats.checked,     color: "text-violet-700",  bg: "bg-violet-50 border-violet-200" },
          { label: "Com Falha",   value: stats.falha,       color: "text-red-700",     bg: "bg-red-50 border-red-200" },
          { label: "Offline",     value: stats.offline,     color: "text-gray-600",    bg: "bg-gray-100 border-gray-300" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-xl border px-3 py-2.5 text-center", s.bg)}>
            <p className={cn("text-xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-[10px] text-gray-500 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-gray-500">
          <span>{stats.checked} / {stats.total} verificados</span>
          <span>{stats.total > 0 ? Math.round((stats.checked / stats.total) * 100) : 0}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${stats.total > 0 ? (stats.checked / stats.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por SN ou container…"
            className="pl-9 rounded-xl h-9 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus ?? "all"}
            onChange={(e) =>
              setFilterStatus(e.target.value === "all" ? "all" : (e.target.value as StatusMinerUI))
            }
            className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <option value="all">Todos ({rows.length})</option>
            <option value="FUNCIONANDO">Funcionando ({stats.funcionando})</option>
            <option value="OFFLINE">Offline ({stats.offline})</option>
            <option value="COM_FALHA">Com Falha ({stats.falha})</option>
            <option value="">Não verificado ({rows.length - stats.checked})</option>
          </select>
          {!readOnly && (
            <button
              type="button"
              onClick={markAllFuncionando}
              className="h-9 px-3 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 whitespace-nowrap"
            >
              ✓ Todos OK
            </button>
          )}
        </div>
      </div>

      {/* Miner list */}
      <MinerList
        rows={filteredRows}
        readOnly={readOnly}
        expandedObs={expandedObs}
        onStatusChange={setRowStatus}
        onObsChange={setRowObs}
        onToggleObs={toggleObs}
      />

      {/* Save button */}
      {!readOnly && (
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || rows.length === 0}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
              savedOk
                ? "bg-emerald-500 text-white"
                : "bg-gradient-to-r from-violet-600 to-purple-700 text-white hover:opacity-90 disabled:opacity-40"
            )}
          >
            {saving ? "Salvando…" : savedOk ? "✓ Salvo!" : `Salvar verificação (${rows.length} miners)`}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Lista paginada ────────────────────────────────────────────────────────────

const PAGE_SIZE = 100;

function MinerList({
  rows,
  readOnly,
  expandedObs,
  onStatusChange,
  onObsChange,
  onToggleObs,
}: {
  rows: MinerRow[];
  readOnly?: boolean;
  expandedObs: Set<string>;
  onStatusChange: (id: string, status: StatusMinerUI) => void;
  onObsChange: (id: string, obs: string) => void;
  onToggleObs: (id: string) => void;
}) {
  const [page, setPage] = useState(1);
  const visible = rows.slice(0, page * PAGE_SIZE);
  const hasMore = rows.length > page * PAGE_SIZE;

  useEffect(() => setPage(1), [rows.length]);

  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-400">
        Nenhum miner corresponde ao filtro.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="divide-y divide-gray-50 rounded-2xl border border-gray-100 bg-white overflow-hidden">
        {visible.map((row) => (
          <MinerRowItem
            key={row.minerInstanceId}
            row={row}
            readOnly={readOnly}
            showObs={expandedObs.has(row.minerInstanceId)}
            onStatusChange={onStatusChange}
            onObsChange={onObsChange}
            onToggleObs={onToggleObs}
          />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          className="w-full py-2 text-xs text-violet-600 font-medium hover:underline"
        >
          Carregar mais ({rows.length - page * PAGE_SIZE} restantes)
        </button>
      )}
    </div>
  );
}

function MinerRowItem({
  row,
  readOnly,
  showObs,
  onStatusChange,
  onObsChange,
  onToggleObs,
}: {
  row: MinerRow;
  readOnly?: boolean;
  showObs: boolean;
  onStatusChange: (id: string, status: StatusMinerUI) => void;
  onObsChange: (id: string, obs: string) => void;
  onToggleObs: (id: string) => void;
}) {
  const statusCfg = row.currentStatus ? STATUS_CONFIG[row.currentStatus] : null;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Status dot */}
        <div
          className={cn(
            "w-2.5 h-2.5 rounded-full shrink-0",
            statusCfg ? statusCfg.dot : "bg-gray-200"
          )}
        />

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-mono font-semibold text-gray-800 leading-none">{row.serialNumber}</p>
          {row.containerId && (
            <p className="text-[10px] text-gray-400 mt-0.5">{row.containerId}</p>
          )}
        </div>

        {/* Status buttons */}
        {!readOnly ? (
          <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
            {(["FUNCIONANDO", "OFFLINE", "COM_FALHA"] as const).map((s) => (
              <StatusButton
                key={s}
                status={s}
                active={row.currentStatus === s}
                onClick={() =>
                  onStatusChange(row.minerInstanceId, row.currentStatus === s ? null : s)
                }
              />
            ))}
            <button
              type="button"
              onClick={() => onToggleObs(row.minerInstanceId)}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
              title="Adicionar observação"
            >
              <ChevronDown
                className={cn("w-3.5 h-3.5 transition-transform", showObs && "rotate-180")}
              />
            </button>
          </div>
        ) : (
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              row.currentStatus === "FUNCIONANDO" && "border-emerald-200 text-emerald-700 bg-emerald-50",
              row.currentStatus === "OFFLINE"      && "border-gray-300 text-gray-600 bg-gray-50",
              row.currentStatus === "COM_FALHA"    && "border-red-200 text-red-700 bg-red-50",
              !row.currentStatus                   && "border-gray-200 text-gray-400"
            )}
          >
            {row.currentStatus ? STATUS_CONFIG[row.currentStatus].label : "Não verificado"}
          </Badge>
        )}
      </div>

      {/* Observation textarea */}
      {showObs && !readOnly && (
        <div className="mt-2 pl-5">
          <textarea
            value={row.observacao}
            onChange={(e) => onObsChange(row.minerInstanceId, e.target.value)}
            placeholder="Observação (opcional)…"
            rows={2}
            className="w-full text-xs rounded-xl border border-gray-200 bg-gray-50 p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 placeholder:text-gray-400"
          />
        </div>
      )}

      {/* Read-only observation */}
      {readOnly && row.observacao && (
        <p className="mt-1 pl-5 text-xs text-gray-500 italic">{row.observacao}</p>
      )}
    </div>
  );
}