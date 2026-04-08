"use client";

import { useState } from "react";
import {
  Cpu,
  Upload,
  Search,
  Plus,
  RotateCw,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import BarcodeScanner from "./barcode-scanner";

interface AsicAsset {
  id: string;
  nome: string;
  codigo: string;
}

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

function normalizeSN(value: string) {
  return value
    .replace(/^M\s*SN[:\s-]*/i, "")
    .replace(/^SN[:\s-]*/i, "")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .trim();
}

function isValidMinerSN(value: string) {
  const sn = normalizeSN(value);
  return /^[A-Z0-9]{8,40}$/.test(sn);
}

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

  const [showImport, setShowImport] = useState(false);
  const [importAssetId, setImportAssetId] = useState(asicAssets[0]?.id ?? "");
  const [importContainerId, setImportContainerId] = useState("");
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    skipped: number;
  } | null>(null);

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
      const res = await fetch(`/api/miners?${params.toString()}`);
      const data = await res.json();

      setMiners(reset ? data.miners : (prev) => [...prev, ...data.miners]);
      setTotalDB(data.total);
      setPage(p);
      setFetched(true);
    } catch (error) {
      console.error("Erro ao buscar miners:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!importAssetId || !importText.trim()) return;

    setImporting(true);
    setImportResult(null);

    const sns = importText
      .split(/[\n,;]/)
      .map((s) => normalizeSN(s))
      .filter((s) => s && isValidMinerSN(s));

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

      setImportResult({
        created: data.created ?? 0,
        skipped: data.skipped ?? 0,
      });

      setImportText("");
      setTotalDB((t) => t + (data.created ?? 0));
      setFetched(false);
      setMiners([]);
    } catch (error) {
      console.error("Erro ao importar miners:", error);
    } finally {
      setImporting(false);
    }
  }

  async function handleAddSingle() {
    const normalized = normalizeSN(singleSN);

    if (!normalized || !singleAssetId || !isValidMinerSN(normalized)) return;

    setAddingOne(true);

    try {
      const res = await fetch("/api/miners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serialNumber: normalized,
          assetId: singleAssetId,
          containerId: singleContainer || undefined,
          status: "ativo",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Erro ao adicionar miner.");
        return;
      }

      setSingleSN("");
      setSingleContainer("");
      setTotalDB((t) => t + 1);
      setFetched(false);
      setMiners([]);
      setShowAddSingle(false);
    } catch (error) {
      console.error("Erro ao adicionar miner:", error);
      alert("Erro ao adicionar miner.");
    } finally {
      setAddingOne(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este miner?")) return;

    try {
      const res = await fetch(`/api/miners/${id}`, { method: "DELETE" });

      if (!res.ok) {
        alert("Não foi possível remover o miner.");
        return;
      }

      setMiners((prev) => prev.filter((m) => m.id !== id));
      setTotalDB((t) => t - 1);
    } catch (error) {
      console.error("Erro ao remover miner:", error);
      alert("Erro ao remover miner.");
    }
  }

  const hasMore = miners.length < totalDB && fetched;
  const singleSNValid = isValidMinerSN(singleSN);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-200 bg-violet-100">
              <Cpu className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Miners (ASICs)</h1>
              <p className="text-sm text-gray-500">
                {totalDB.toLocaleString("pt-BR")} machines registradas
              </p>
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddSingle((s) => !s)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </button>

            <button
              onClick={() => setShowImport((s) => !s)}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
            >
              <Upload className="h-4 w-4" />
              Importar em massa
            </button>
          </div>
        )}
      </div>

      {showAddSingle && canEdit && (
        <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-800">
            Adicionar miner individual
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-gray-600">
                Serial Number *
              </label>
              <Input
                value={singleSN}
                onChange={(e) => setSingleSN(normalizeSN(e.target.value))}
                placeholder="Ex: H00ZFCABDABJF004N"
                className="rounded-xl font-mono"
              />
              {singleSN ? (
                <p
                  className={cn(
                    "text-xs",
                    singleSNValid ? "text-emerald-600" : "text-amber-600"
                  )}
                >
                  {singleSNValid
                    ? "Formato de SN válido."
                    : "Formato ainda inválido. Revise a leitura."}
                </p>
              ) : null}
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setShowScanner(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                📷 Escanear
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">
                Modelo ASIC *
              </label>
              <select
                value={singleAssetId}
                onChange={(e) => setSingleAssetId(e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                {asicAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">
                Container ID
              </label>
              <Input
                value={singleContainer}
                onChange={(e) => setSingleContainer(e.target.value)}
                placeholder="HK3-01"
                className="rounded-xl"
              />
            </div>
          </div>

          {showScanner && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
              <BarcodeScanner
                onScan={(code) => {
                  const normalized = normalizeSN(code);
                  setSingleSN(normalized);
                  setShowScanner(false);
                }}
                onClose={() => setShowScanner(false)}
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAddSingle}
              disabled={addingOne || !singleSNValid}
              className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-violet-700"
            >
              {addingOne ? "Adicionando..." : "Adicionar"}
            </button>

            <button
              onClick={() => setShowAddSingle(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showImport && canEdit && (
        <div className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50 p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-800">
              <Upload className="h-4 w-4" />
              Importação em Massa de Miners
            </p>

            <button
              onClick={() => setShowImport(false)}
              className="text-xs text-violet-400 hover:underline"
            >
              fechar
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-violet-800">Modelo ASIC *</label>
              <select
                value={importAssetId}
                onChange={(e) => setImportAssetId(e.target.value)}
                className="h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                {asicAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome} ({a.codigo})
                  </option>
                ))}
                {asicAssets.length === 0 && (
                  <option value="">Nenhum modelo ASIC cadastrado</option>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-violet-800">
                Container ID (opcional)
              </label>
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
              placeholder={"H00ZFCABDABJF004N\nH00ZFCABDABJF005N\nH00ZFCABDABJF006N"}
              className="w-full resize-y rounded-xl border border-violet-200 bg-white p-3 font-mono text-sm placeholder:text-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />

            <p className="text-xs text-violet-600">
              {
                importText
                  .split(/[\n,;]/)
                  .map((s) => normalizeSN(s))
                  .filter((s) => s && isValidMinerSN(s)).length
              }{" "}
              serial numbers válidos detectados
            </p>
          </div>

          {importResult && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              <p className="text-sm font-medium text-emerald-700">
                {importResult.created} miners importados.
                {importResult.skipped > 0 &&
                  ` ${importResult.skipped} ignorados (SN duplicado).`}
              </p>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={importing || !importAssetId || !importText.trim()}
            className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-40 hover:bg-violet-700"
          >
            {importing ? "Importando..." : "Importar Miners"}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchMiners(1, true)}
            placeholder="Buscar por SN ou container..."
            className="rounded-xl pl-9"
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
            {asicAssets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={() => fetchMiners(1, true)}
          disabled={loading}
          className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:border-gray-300 disabled:opacity-50"
        >
          <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
          {fetched ? "Atualizar" : "Carregar"}
        </button>
      </div>

      {!fetched ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <Cpu className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            {totalDB.toLocaleString("pt-BR")} miners registrados
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Clique em "Carregar" para listar.
          </p>
        </div>
      ) : miners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-400">Nenhum miner encontrado.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 sm:grid">
            <span>Serial Number</span>
            <span>Container</span>
            <span>Modelo</span>
            <span>Status</span>
            {canEdit && <span />}
          </div>

          <div className="divide-y divide-gray-50">
            {miners.map((m) => (
              <div
                key={m.id}
                className="grid grid-cols-1 items-center gap-2 px-4 py-3 transition-colors hover:bg-gray-50 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:gap-4"
              >
                <p className="font-mono text-sm font-semibold text-gray-800">
                  {m.serialNumber}
                </p>

                <p className="text-xs text-gray-500">
                  {m.containerId ?? <span className="text-gray-300">—</span>}
                </p>

                <p className="truncate text-xs text-gray-600">
                  {m.asset?.nome ?? "—"}
                </p>

                <Badge className={cn("w-fit border text-[10px]", STATUS_COLOR[m.status])}>
                  {STATUS_LABEL[m.status]}
                </Badge>

                {canEdit && (
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="border-t border-gray-50 px-4 py-3">
              <button
                onClick={() => fetchMiners(page + 1)}
                disabled={loading}
                className="w-full text-sm font-medium text-violet-600 hover:underline disabled:opacity-50"
              >
                {loading
                  ? "Carregando..."
                  : `Carregar mais (${totalDB - miners.length} restantes)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}