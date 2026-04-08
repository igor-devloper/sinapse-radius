"use client";

import { useState, useCallback, useRef } from "react";
import {
  Cpu, Upload, Search, Plus, RotateCw, CheckCircle2,
  WifiOff, AlertTriangle, ChevronDown, Download, Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import BarcodeScanner from "./barcode-scanner";

interface AsicAsset { id: string; nome: string; codigo: string; }
interface MinerRow {
  id: string;
  serialNumber: string;
  containerId: string | null;
  status: "ativo" | "inativo" | "manutencao";
  asset: { nome: string; codigo: string };
}

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  manutencao: "Manutenção",
};
const STATUS_COLOR: Record<string, string> = {
  ativo: "bg-emerald-100 text-emerald-700 border-emerald-200",
  inativo: "bg-gray-100 text-gray-600 border-gray-200",
  manutencao: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function MinersPageClient({
  initialCount,
  asicAssets,
  userCargo,
}: {
  initialCount: number;
  asicAssets: AsicAsset[];
  userCargo: string;
}) {
  const canEdit = ["ADMIN", "SUPERVISOR"].includes(userCargo);

  const [miners, setMiners] = useState<MinerRow[]>([]);
  const [totalDB, setTotalDB] = useState(initialCount);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAsset, setFilterAsset] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  // Import state
  const [showImport, setShowImport] = useState(false);
  const [importAssetId, setImportAssetId] = useState(asicAssets[0]?.id ?? "");
  const [importContainerId, setImportContainerId] = useState("");
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);

  // Single add state
  const [showAddSingle, setShowAddSingle] = useState(false);
  const [singleSN, setSingleSN] = useState("");
  const [singleAssetId, setSingleAssetId] = useState(asicAssets[0]?.id ?? "");
  const [singleContainer, setSingleContainer] = useState("");
  const [addingOne, setAddingOne] = useState(false);

  const LIMIT = 100;

  async function fetchMiners(p = 1, reset = false) {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("limit", String(LIMIT));
    if (search.trim()) params.set("q", search.trim());
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterAsset !== "all") params.set("assetId", filterAsset);

    try {
      const res = await fetch(`/api/miners?${params}`);
      const data = await res.json();
      setMiners(reset ? data.miners : (prev) => [...prev, ...data.miners]);
      setTotalDB(data.total);
      setPage(p);
      setFetched(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!importAssetId || !importText.trim()) return;
    setImporting(true);
    setImportResult(null);

    // Parse SNs: one per line or comma-separated
    const sns = importText
      .split(/[\n,;]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = sns.map((sn) => ({
      serialNumber: sn,
      assetId: importAssetId,
      containerId: importContainerId || undefined,
      status: "ativo",
    }));

    try {
      const res = await fetch("/api/miners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setImportResult({ created: data.created, skipped: data.skipped });
      setImportText("");
      setTotalDB((t) => t + (data.created ?? 0));
      // Refresh list
      setFetched(false);
      setMiners([]);
    } finally {
      setImporting(false);
    }
  }

  async function handleAddSingle() {
    if (!singleSN.trim() || !singleAssetId) return;
    setAddingOne(true);
    try {
      const res = await fetch("/api/miners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serialNumber: singleSN.trim(),
          assetId: singleAssetId,
          containerId: singleContainer || undefined,
          status: "ativo",
        }),
      });
      if (res.ok) {
        setSingleSN(""); setSingleContainer("");
        setTotalDB((t) => t + 1);
        setFetched(false); setMiners([]);
        setShowAddSingle(false);
      }
    } finally {
      setAddingOne(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este miner?")) return;
    await fetch(`/api/miners/${id}`, { method: "DELETE" });
    setMiners((prev) => prev.filter((m) => m.id !== id));
    setTotalDB((t) => t - 1);
  }

  const hasMore = miners.length < totalDB && fetched;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 border border-violet-200 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Miners (ASICs)</h1>
              <p className="text-sm text-gray-500">{totalDB.toLocaleString("pt-BR")} machines registradas</p>
            </div>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowAddSingle((s) => !s)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
            <button
              onClick={() => setShowImport((s) => !s)}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              <Upload className="w-4 h-4" /> Importar em massa
            </button>
          </div>
        )}
      </div>

      {/* Add single form */}
      {showAddSingle && canEdit && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-800">Adicionar miner individual</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Serial Number *</label>
              <Input value={singleSN} onChange={(e) => setSingleSN(e.target.value)} placeholder="Ex: SN001234" className="rounded-xl" />
            </div>
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
            >
              📷 Escanear
            </button>
            {showScanner && (
              <div className="space-y-3">
                <BarcodeScanner
                  onScan={(code) => {
                    setSingleSN(code); // preenche automaticamente
                    setShowScanner(false);
                  }}
                />
                <button
                  onClick={() => setShowScanner(false)}
                  className="text-sm text-gray-500"
                >
                  Cancelar
                </button>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Modelo ASIC *</label>
              <select
                value={singleAssetId}
                onChange={(e) => setSingleAssetId(e.target.value)}
                className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                {asicAssets.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Container ID</label>
              <Input value={singleContainer} onChange={(e) => setSingleContainer(e.target.value)} placeholder="HK3-01" className="rounded-xl" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddSingle} disabled={addingOne || !singleSN.trim()}
              className="flex-1 py-2 rounded-xl bg-violet-600 text-sm text-white font-semibold disabled:opacity-40 hover:bg-violet-700">
              {addingOne ? "Adicionando…" : "Adicionar"}
            </button>
            <button onClick={() => setShowAddSingle(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Bulk import */}
      {showImport && canEdit && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-violet-800 flex items-center gap-2">
              <Upload className="w-4 h-4" /> Importação em Massa de Miners
            </p>
            <button onClick={() => setShowImport(false)} className="text-violet-400 text-xs hover:underline">fechar</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-violet-800">Modelo ASIC *</label>
              <select
                value={importAssetId}
                onChange={(e) => setImportAssetId(e.target.value)}
                className="w-full h-10 rounded-xl border border-violet-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                {asicAssets.map((a) => <option key={a.id} value={a.id}>{a.nome} ({a.codigo})</option>)}
                {asicAssets.length === 0 && <option value="">Nenhum modelo ASIC cadastrado</option>}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-violet-800">Container ID (opcional)</label>
              <Input
                value={importContainerId}
                onChange={(e) => setImportContainerId(e.target.value)}
                placeholder="Ex: HK3-01 (aplica a todos)"
                className="rounded-xl border-violet-200"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-violet-800">
              Serial Numbers * — um por linha ou separados por vírgula
            </label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={8}
              placeholder={"SN001\nSN002\nSN003\n..."}
              className="w-full rounded-xl border border-violet-200 bg-white p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder:text-violet-300"
            />
            <p className="text-xs text-violet-600">
              {importText.split(/[\n,;]/).filter((s) => s.trim()).length} serial numbers detectados
            </p>
          </div>
          {importResult && (
            <div className="flex items-center gap-3 bg-white rounded-xl border border-emerald-200 px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-700 font-medium">
                {importResult.created} miners importados.
                {importResult.skipped > 0 && ` ${importResult.skipped} ignorados (SN duplicado).`}
              </p>
            </div>
          )}
          <button
            onClick={handleImport}
            disabled={importing || !importAssetId || !importText.trim()}
            className="w-full py-2.5 rounded-xl bg-violet-600 text-sm text-white font-semibold disabled:opacity-40 hover:bg-violet-700 transition-colors"
          >
            {importing ? "Importando…" : "Importar Miners"}
          </button>
        </div>
      )}

      {/* Filters + Search */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchMiners(1, true)}
            placeholder="Buscar por SN ou container…"
            className="pl-9 rounded-xl"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
        >
          <option value="all">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
          <option value="manutencao">Em Manutenção</option>
        </select>
        {asicAssets.length > 1 && (
          <select
            value={filterAsset}
            onChange={(e) => setFilterAsset(e.target.value)}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <option value="all">Todos os modelos</option>
            {asicAssets.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        )}
        <button
          onClick={() => fetchMiners(1, true)}
          disabled={loading}
          className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-gray-300 flex items-center gap-2 disabled:opacity-50"
        >
          <RotateCw className={cn("w-4 h-4", loading && "animate-spin")} />
          {fetched ? "Atualizar" : "Carregar"}
        </button>
      </div>

      {/* List */}
      {!fetched ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <Cpu className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">{totalDB.toLocaleString("pt-BR")} miners registrados</p>
          <p className="text-xs text-gray-400 mt-1">Clique em "Carregar" para listar.</p>
        </div>
      ) : miners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-400">Nenhum miner encontrado.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            <span>Serial Number</span>
            <span>Container</span>
            <span>Modelo</span>
            <span>Status</span>
            {canEdit && <span />}
          </div>
          <div className="divide-y divide-gray-50">
            {miners.map((m) => (
              <div key={m.id} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 sm:gap-4 px-4 py-3 hover:bg-gray-50 transition-colors items-center">
                <p className="font-mono text-sm font-semibold text-gray-800">{m.serialNumber}</p>
                <p className="text-xs text-gray-500">{m.containerId ?? <span className="text-gray-300">—</span>}</p>
                <p className="text-xs text-gray-600 truncate">{m.asset?.nome ?? "—"}</p>
                <Badge className={cn("text-[10px] w-fit border", STATUS_COLOR[m.status])}>
                  {STATUS_LABEL[m.status]}
                </Badge>
                {canEdit && (
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="px-4 py-3 border-t border-gray-50">
              <button
                onClick={() => fetchMiners(page + 1)}
                disabled={loading}
                className="w-full text-sm text-violet-600 font-medium hover:underline disabled:opacity-50"
              >
                {loading ? "Carregando…" : `Carregar mais (${totalDB - miners.length} restantes)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}