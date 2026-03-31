"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search, Plus, Loader2, Pencil, Trash2, Package2,
  RefreshCw, ImageIcon, Link2, ChevronDown, ChevronUp,
  ShieldCheck, LayoutGrid, Table2, Download, X, Check, AlertTriangle,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { CHECKLIST_PREVENTIVA } from "@/lib/checklist-preventiva";
import { cn } from "@/lib/utils";

type AssetLinkRecord = {
  checklistItemId: string;
  itemCodigo: string;
  itemDescricao: string;
  itemSubsistema: string;
  itemPeriodicidade: string;
};
type AssetRecord = {
  id: string;
  nome: string;
  codigo: string;
  fotoUrl: string | null;
  isAsicModel: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  checklistLinks: AssetLinkRecord[];
};

const CHECKLIST_GROUPS = CHECKLIST_PREVENTIVA.reduce<Record<string, typeof CHECKLIST_PREVENTIVA>>(
  (acc, item) => { (acc[item.subsistema] ??= []).push(item); return acc; }, {}
);

const PRIORIDADE_MAP: Record<string, { label: string; class: string }> = {
  CRITICA: { label: "Crítica", class: "bg-red-100 text-red-700 border-red-200" },
  ALTA:    { label: "Alta",    class: "bg-orange-100 text-orange-700 border-orange-200" },
  MEDIA:   { label: "Média",  class: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  BAIXA:   { label: "Baixa",  class: "bg-green-100 text-green-700 border-green-200" },
};

function inferPrioridade(links: AssetLinkRecord[]): string {
  const ps = links.map((l) => l.itemPeriodicidade);
  if (ps.includes("Anual") || ps.includes("A cada 1-2 anos")) return "ALTA";
  if (ps.includes("Semestral") || ps.includes("Trimestral")) return "MEDIA";
  if (ps.includes("2 meses")) return "MEDIA";
  return "BAIXA";
}

function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function AssetThumbnail({ src, alt, size = "md" }: { src: string | null; alt: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-9 w-9", md: "h-14 w-14", lg: "h-20 w-20" };
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-xl border bg-muted/40", sizes[size])}>
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" sizes="80px" unoptimized />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ImageIcon className={size === "lg" ? "h-6 w-6" : "h-4 w-4"} />
        </div>
      )}
    </div>
  );
}

// ─── Toggle ASIC ──────────────────────────────────────────────────────────────
function AsicToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all select-none",
        value
          ? "border-cyan-300 bg-cyan-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      )}
    >
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
        value ? "bg-cyan-500" : "bg-gray-100"
      )}>
        <Cpu className={cn("h-4 w-4", value ? "text-white" : "text-gray-400")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold", value ? "text-cyan-800" : "text-gray-700")}>
          Modelo ASIC (miner)
        </p>
        <p className={cn("text-xs mt-0.5", value ? "text-cyan-600" : "text-gray-400")}>
          {value
            ? "Miners serão cadastrados individualmente por número de série."
            : "Ative para gerenciar miners (SNs) vinculados a este modelo."}
        </p>
      </div>
      {/* Switch visual */}
      <div className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        value ? "bg-cyan-500" : "bg-gray-200"
      )}>
        <span className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
          value ? "left-4" : "left-0.5"
        )} />
      </div>
    </div>
  );
}

function ChecklistSelector({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [query, setQuery] = React.useState("");
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    const s: Record<string, boolean> = {};
    Object.keys(CHECKLIST_GROUPS).forEach((g) => { s[g] = true; });
    return s;
  });
  const selected = React.useMemo(() => new Set(value), [value]);

  function toggle(itemId: string) {
    onChange(selected.has(itemId) ? value.filter((id) => id !== itemId) : [...value, itemId]);
  }
  const q = query.trim().toLowerCase();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-xs font-semibold text-gray-700">Vincular ao checklist preventivo</Label>
          <p className="text-xs text-muted-foreground mt-0.5">O ativo é herdado automaticamente na OS quando o item entrar na visita.</p>
        </div>
        <Badge variant="secondary" className="rounded-lg px-2.5 py-1 text-[11px] shrink-0">
          {value.length} vínculo{value.length === 1 ? "" : "s"}
        </Badge>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar item…" className="pl-9 h-9 text-sm" />
      </div>
      <div className="max-h-72 overflow-y-auto rounded-xl border border-border/60 bg-background">
        {Object.entries(CHECKLIST_GROUPS).map(([group, items]) => {
          const filtered = items.filter((item) => {
            if (!q) return true;
            return `${item.id} ${item.descricao} ${item.periodicidade}`.toLowerCase().includes(q);
          });
          if (filtered.length === 0) return null;
          const isOpen = openGroups[group] ?? true;
          return (
            <div key={group} className="border-b last:border-b-0">
              <button type="button"
                onClick={() => setOpenGroups((p) => ({ ...p, [group]: !isOpen }))}
                className="flex w-full items-center justify-between bg-muted/40 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>{group}</span>
                {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {isOpen && (
                <div className="divide-y">
                  {filtered.map((item) => {
                    const checked = selected.has(item.id);
                    return (
                      <label key={item.id}
                        className={cn("flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors", checked && "bg-violet-50/60")}>
                        <div className={cn("mt-0.5 h-4 w-4 rounded flex items-center justify-center border shrink-0 transition-colors",
                          checked ? "bg-violet-600 border-violet-600" : "border-gray-300")}>
                          {checked && <Check className="h-3 w-3 text-white" />}
                          <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(item.id)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[11px] font-semibold text-violet-700">{item.id}</span>
                            <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[10px] font-medium">{item.periodicidade}</Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-foreground leading-snug">{item.descricao}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AssetFormFields({
  nome, setNome, codigo, setCodigo, file, setFile,
  isAsicModel, setIsAsicModel,
  checklistIds, setChecklistIds, fotoPreviewUrl, currentFotoUrl, isEdit,
}: {
  nome: string; setNome: (v: string) => void;
  codigo: string; setCodigo: (v: string) => void;
  file: File | null; setFile: (f: File | null) => void;
  isAsicModel: boolean; setIsAsicModel: (v: boolean) => void;
  checklistIds: string[]; setChecklistIds: (ids: string[]) => void;
  fotoPreviewUrl: string | null;
  currentFotoUrl?: string | null;
  isEdit?: boolean;
}) {
  const previewSrc = fotoPreviewUrl ?? currentFotoUrl ?? null;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="af-nome" className="text-xs font-semibold text-gray-700">Nome do ativo <span className="text-red-400">*</span></Label>
          <Input id="af-nome" placeholder="Ex.: Antminer HQ3V6" value={nome} onChange={(e) => setNome(e.target.value)} required className="rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="af-codigo" className="text-xs font-semibold text-gray-700">Código <span className="text-red-400">*</span></Label>
          <Input id="af-codigo" placeholder="Ex.: ASIC-HQ3V6" value={codigo} onChange={(e) => setCodigo(e.target.value)} required className="rounded-xl" />
        </div>
      </div>

      {/* Toggle ASIC */}
      <AsicToggle value={isAsicModel} onChange={setIsAsicModel} />

      {/* Foto — só mostra se não for ASIC (miners não têm foto individual) */}
      {!isAsicModel && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-700">Foto do ativo <span className="text-gray-400 font-normal">(opcional)</span></Label>
          <div className="flex items-center gap-3">
            {previewSrc && (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-muted/40">
                <Image src={previewSrc} alt={nome || "ativo"} fill className="object-cover" sizes="56px" unoptimized />
              </div>
            )}
            <label className="flex-1 flex items-center gap-2.5 rounded-xl border border-dashed border-violet-200 bg-violet-50/40 px-3 py-2.5 cursor-pointer hover:bg-violet-50 transition-colors">
              <ImageIcon className="h-4 w-4 text-violet-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-violet-800">{file ? file.name : (isEdit ? "Substituir foto" : "Enviar foto")}</p>
                <p className="text-[10px] text-violet-500">JPG, PNG, WEBP — máx 10 MB</p>
              </div>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            {file && (
              <button type="button" onClick={() => setFile(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Info quando é ASIC */}
      {isAsicModel && (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 px-4 py-3 flex items-start gap-3">
          <Cpu className="h-4 w-4 text-cyan-500 mt-0.5 shrink-0" />
          <div className="text-xs text-cyan-700 space-y-1">
            <p className="font-semibold">Como funciona o modelo ASIC</p>
            <p>Este ativo representa o <strong>modelo</strong> do miner (ex: Antminer HQ3V6). Após criar, vá em <strong>Ativos → Miners</strong> para cadastrar cada máquina individualmente pelo número de série (SN).</p>
          </div>
        </div>
      )}

      <ChecklistSelector value={checklistIds} onChange={setChecklistIds} />
    </div>
  );
}

function exportCSV(assets: AssetRecord[]) {
  const headers = ["#", "Nome", "Código", "Tipo", "Prioridade", "Qtd Vínculos", "IDs Vinculados", "Periodicidades", "Cadastro"];
  const rows = assets.map((a, i) => {
    const prioridade = PRIORIDADE_MAP[inferPrioridade(a.checklistLinks)]?.label ?? "";
    const ids = a.checklistLinks.map((l) => l.itemCodigo).join("; ");
    const periodicidades = Array.from(new Set(a.checklistLinks.map((l) => l.itemPeriodicidade))).join(", ");
    return [i + 1, a.nome, a.codigo, a.isAsicModel ? "ASIC" : "Equipamento", prioridade, a.checklistLinks.length, ids, periodicidades, formatDate(a.createdAt)];
  });
  const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ativos_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Spreadsheet View ─────────────────────────────────────────────────────────
function SpreadsheetView({ assets, canManage, onEdit, onDelete, busyId }: {
  assets: AssetRecord[]; canManage: boolean;
  onEdit: (a: AssetRecord) => void; onDelete: (id: string, nome: string) => void; busyId: string | null;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 900 }}>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-10">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-12"></th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-28">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-36">Código</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-28">Prioridade</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-20">Vínculos</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Periodicidades</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-28">Cadastro</th>
              {canManage && <th className="w-20"></th>}
            </tr>
          </thead>
          <tbody>
            {assets.map((asset, idx) => {
              const prio = inferPrioridade(asset.checklistLinks);
              const pMap = PRIORIDADE_MAP[prio];
              const periodicidades = Array.from(new Set(asset.checklistLinks.map((l) => l.itemPeriodicidade)));
              const isBusy = busyId === asset.id;
              return (
                <tr key={asset.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group">
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{String(idx + 1).padStart(2, "0")}</td>
                  <td className="px-4 py-3">
                    {asset.isAsicModel ? (
                      <div className="h-9 w-9 rounded-xl border border-cyan-200 bg-cyan-50 flex items-center justify-center">
                        <Cpu className="h-4 w-4 text-cyan-500" />
                      </div>
                    ) : (
                      <AssetThumbnail src={asset.fotoUrl} alt={asset.nome} size="sm" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 text-sm">{asset.nome}</p>
                    {asset.checklistLinks.length > 0 && (
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[260px]">
                        {asset.checklistLinks.slice(0, 3).map((l) => l.itemCodigo).join(", ")}
                        {asset.checklistLinks.length > 3 && ` +${asset.checklistLinks.length - 3}`}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {asset.isAsicModel ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 border border-cyan-200 px-2 py-1 text-[11px] font-semibold text-cyan-700">
                        <Cpu className="h-3 w-3" /> ASIC
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-500">
                        Equipamento
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-1 text-xs font-mono font-medium text-gray-700">{asset.codigo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-semibold border", pMap.class)}>{pMap.label}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold text-gray-800">{asset.checklistLinks.length}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {periodicidades.slice(0, 3).map((p) => (
                        <span key={p} className="rounded-md bg-violet-50 text-violet-700 px-1.5 py-0.5 text-[10px] font-medium border border-violet-100">{p}</span>
                      ))}
                      {periodicidades.length > 3 && <span className="text-[10px] text-gray-400">+{periodicidades.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(asset.createdAt)}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(asset)} className="p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => onDelete(asset.id, asset.nome)} disabled={isBusy} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Card View ─────────────────────────────────────────────────────────────────
function CardView({ assets, canManage, onEdit, onDelete, busyId }: {
  assets: AssetRecord[]; canManage: boolean;
  onEdit: (a: AssetRecord) => void; onDelete: (id: string, nome: string) => void; busyId: string | null;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {assets.map((asset) => {
        const prio = inferPrioridade(asset.checklistLinks);
        const pMap = PRIORIDADE_MAP[prio];
        const isBusy = busyId === asset.id;
        const periodicidades = Array.from(new Set(asset.checklistLinks.map((l) => l.itemPeriodicidade)));
        return (
          <div key={asset.id} className={cn(
            "bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden group",
            asset.isAsicModel ? "border-cyan-100" : "border-gray-100"
          )}>
            {/* ASIC stripe */}
            {asset.isAsicModel && <div className="h-1 w-full bg-gradient-to-r from-cyan-400 to-blue-500" />}

            <div className="flex items-start gap-3 p-4 pb-3">
              {asset.isAsicModel ? (
                <div className="h-14 w-14 shrink-0 rounded-xl border border-cyan-200 bg-cyan-50 flex items-center justify-center">
                  <Cpu className="h-6 w-6 text-cyan-500" />
                </div>
              ) : (
                <AssetThumbnail src={asset.fotoUrl} alt={asset.nome} size="md" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 leading-tight">{asset.nome}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600">{asset.codigo}</span>
                      {asset.isAsicModel ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 border border-cyan-200 px-2 py-0.5 text-[11px] font-semibold text-cyan-700">
                          <Cpu className="h-3 w-3" /> ASIC
                        </span>
                      ) : (
                        <span className={cn("rounded-lg px-2 py-0.5 text-[11px] font-semibold border", pMap.class)}>{pMap.label}</span>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(asset)} className="p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => onDelete(asset.id, asset.nome)} disabled={isBusy} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mx-4 mb-4 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 mb-2">
                <Link2 className="h-3 w-3 text-violet-500" />
                {asset.checklistLinks.length > 0 ? `${asset.checklistLinks.length} item${asset.checklistLinks.length !== 1 ? "s" : ""} vinculados` : "Sem vínculos"}
              </div>
              {asset.checklistLinks.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  {asset.isAsicModel ? "Cadastre miners em Ativos → Miners." : "Nenhum item vinculado."}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {asset.checklistLinks.slice(0, 3).map((link) => (
                    <div key={link.checklistItemId} className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-semibold text-violet-600 shrink-0 w-12">{link.itemCodigo}</span>
                      <span className="text-[11px] text-gray-600 truncate flex-1">{link.itemDescricao}</span>
                      <span className="text-[10px] text-violet-400 shrink-0">{link.itemPeriodicidade}</span>
                    </div>
                  ))}
                  {asset.checklistLinks.length > 3 && <p className="text-[11px] text-gray-400 pt-1">+{asset.checklistLinks.length - 3} mais</p>}
                </div>
              )}
              {periodicidades.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-100">
                  {periodicidades.map((p) => (
                    <span key={p} className="rounded-md bg-violet-50 text-violet-700 px-1.5 py-0.5 text-[10px] font-medium border border-violet-100">{p}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-medium">
                {asset.isAsicModel ? (
                  <span className="text-cyan-600 flex items-center gap-1"><Cpu className="h-3 w-3" /> Gerenciado por SN</span>
                ) : (
                  <span className="text-emerald-600 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Herda para OS</span>
                )}
              </div>
              <p className="text-[11px] text-gray-400">{formatDate(asset.createdAt)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export function AtivosPageClient({ initialAssets, canManage }: { initialAssets: AssetRecord[]; canManage: boolean }) {
  const router = useRouter();
  const [assets, setAssets] = React.useState<AssetRecord[]>(initialAssets);
  const [query, setQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"table" | "cards">("table");
  const [filterPrioridade, setFilterPrioridade] = React.useState("");
  const [refreshing, setRefreshing] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = React.useState(false);
  const [cNome, setCNome] = React.useState("");
  const [cCodigo, setCCodigo] = React.useState("");
  const [cFile, setCFile] = React.useState<File | null>(null);
  const [cIsAsic, setCIsAsic] = React.useState(false);
  const [cIds, setCIds] = React.useState<string[]>([]);
  const [cPreview, setCPreview] = React.useState<string | null>(null);

  // Edit dialog
  const [editOpen, setEditOpen] = React.useState(false);
  const [editAsset, setEditAsset] = React.useState<AssetRecord | null>(null);
  const [eNome, setENome] = React.useState("");
  const [eCodigo, setECodigo] = React.useState("");
  const [eFile, setEFile] = React.useState<File | null>(null);
  const [eIsAsic, setEIsAsic] = React.useState(false);
  const [eIds, setEIds] = React.useState<string[]>([]);
  const [ePreview, setEPreview] = React.useState<string | null>(null);

  React.useEffect(() => { setCPreview(cFile ? URL.createObjectURL(cFile) : null); }, [cFile]);
  React.useEffect(() => { setEPreview(eFile ? URL.createObjectURL(eFile) : null); }, [eFile]);

  const filteredAssets = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      const matchQuery = !q || a.nome.toLowerCase().includes(q) || a.codigo.toLowerCase().includes(q) ||
        a.checklistLinks.some((l) => `${l.itemCodigo} ${l.itemDescricao}`.toLowerCase().includes(q));
      const matchPrio = !filterPrioridade || inferPrioridade(a.checklistLinks) === filterPrioridade;
      return matchQuery && matchPrio;
    });
  }, [assets, query, filterPrioridade]);

  async function refreshAssets(showToast = false) {
    try {
      setRefreshing(true);
      const res = await fetch("/api/assets", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao carregar ativos");
      setAssets(Array.isArray(data.assets) ? data.assets : []);
      router.refresh();
      if (showToast) toast.success("Lista atualizada");
    } catch (err: any) { toast.error(err?.message || "Erro ao atualizar"); }
    finally { setRefreshing(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("nome", cNome);
      fd.append("codigo", cCodigo);
      fd.append("isAsicModel", String(cIsAsic));
      if (cFile) fd.append("file", cFile);
      cIds.forEach((id) => fd.append("checklistItemIds", id));
      const res = await fetch("/api/assets", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao criar ativo");
      toast.success(cIsAsic ? "Modelo ASIC criado! Agora cadastre os miners em Ativos → Miners." : "Ativo criado com sucesso");
      setCreateOpen(false); setCNome(""); setCCodigo(""); setCFile(null); setCIds([]); setCIsAsic(false);
      await refreshAssets();
    } catch (err: any) { toast.error(err?.message || "Erro ao criar ativo"); }
    finally { setSaving(false); }
  }

  function startEdit(asset: AssetRecord) {
    setEditAsset(asset); setENome(asset.nome); setECodigo(asset.codigo);
    setEIsAsic(asset.isAsicModel);
    setEFile(null); setEIds(asset.checklistLinks.map((l) => l.checklistItemId));
    setEditOpen(true);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || !editAsset) return;
    try {
      setSaving(true); setBusyId(editAsset.id);
      const fd = new FormData();
      fd.append("nome", eNome);
      fd.append("codigo", eCodigo);
      fd.append("isAsicModel", String(eIsAsic));
      if (eFile) fd.append("file", eFile);
      eIds.forEach((id) => fd.append("checklistItemIds", id));
      const res = await fetch(`/api/assets/${editAsset.id}`, { method: "PATCH", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao atualizar");
      toast.success("Ativo atualizado");
      setEditOpen(false);
      await refreshAssets();
    } catch (err: any) { toast.error(err?.message || "Erro ao atualizar"); }
    finally { setSaving(false); setBusyId(null); }
  }

  async function handleDelete(assetId: string, assetNome: string) {
    if (!canManage) return;
    if (!window.confirm(`Excluir o ativo "${assetNome}"?`)) return;
    try {
      setBusyId(assetId);
      const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao excluir");
      toast.success("Ativo excluído");
      await refreshAssets();
    } catch (err: any) { toast.error(err?.message || "Erro ao excluir"); }
    finally { setBusyId(null); }
  }

  const asicCount = assets.filter((a) => a.isAsicModel).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#1E1B4B,#8B1FA9)" }}>
              <Package2 className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Ativos</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-12">Equipamentos cadastrados com vínculos ao checklist preventivo.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex h-8 items-center rounded-lg bg-gray-100 px-3 text-xs font-semibold text-gray-700">
            {assets.length} ativo{assets.length !== 1 ? "s" : ""}
          </span>
          {asicCount > 0 && (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-cyan-50 border border-cyan-200 px-3 text-xs font-semibold text-cyan-700">
              <Cpu className="h-3 w-3" /> {asicCount} modelo{asicCount !== 1 ? "s" : ""} ASIC
            </span>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => exportCSV(filteredAssets)}>
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => refreshAssets(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
          {canManage && (
            <Button size="sm" className="gap-1.5 h-8" onClick={() => setCreateOpen(true)}
              style={{ background: "linear-gradient(135deg,#1E1B4B,#8B1FA9)" }}>
              <Plus className="h-3.5 w-3.5" /> Novo ativo
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar ativo…" className="pl-9 h-9" />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100">
                <X className="h-3.5 w-3.5 text-gray-400" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {["", "CRITICA", "ALTA", "MEDIA", "BAIXA"].map((p) => {
              const pMap = p ? PRIORIDADE_MAP[p] : null;
              const active = filterPrioridade === p;
              return (
                <button key={p} onClick={() => setFilterPrioridade(p)}
                  className={cn("h-8 px-2.5 rounded-lg text-xs font-medium border transition-all",
                    active
                      ? (pMap ? cn(pMap.class, "ring-2 ring-offset-1 ring-gray-300") : "bg-gray-900 text-white border-gray-900")
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300")}>
                  {p ? pMap?.label : "Todas"}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 bg-white shrink-0">
          <button onClick={() => setViewMode("table")} className={cn("p-1.5 rounded-md transition-colors", viewMode === "table" ? "bg-gray-100" : "hover:bg-gray-50")}>
            <Table2 className="h-4 w-4 text-gray-600" />
          </button>
          <button onClick={() => setViewMode("cards")} className={cn("p-1.5 rounded-md transition-colors", viewMode === "cards" ? "bg-gray-100" : "hover:bg-gray-50")}>
            <LayoutGrid className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-200 py-20">
          <div className="rounded-2xl bg-gray-100 p-4"><Package2 className="h-8 w-8 text-gray-400" /></div>
          <div className="text-center">
            <p className="font-semibold text-gray-700">Nenhum ativo encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">{query || filterPrioridade ? "Tente ajustar os filtros." : "Cadastre o primeiro equipamento."}</p>
          </div>
          {canManage && !query && !filterPrioridade && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2" style={{ background: "linear-gradient(135deg,#1E1B4B,#8B1FA9)" }}>
              <Plus className="h-4 w-4" /> Criar primeiro ativo
            </Button>
          )}
        </div>
      ) : viewMode === "table" ? (
        <SpreadsheetView assets={filteredAssets} canManage={canManage} onEdit={startEdit} onDelete={handleDelete} busyId={busyId} />
      ) : (
        <CardView assets={filteredAssets} canManage={canManage} onEdit={startEdit} onDelete={handleDelete} busyId={busyId} />
      )}

      {!canManage && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Seu perfil pode visualizar os ativos, mas não pode criar, editar ou excluir.
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#1E1B4B,#8B1FA9)" }}>
                <Plus className="h-4 w-4 text-white" />
              </div>
              Novo ativo
            </DialogTitle>
            <DialogDescription>Cadastre um equipamento e vincule-o aos itens do checklist preventivo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5 pt-2">
            <AssetFormFields
              nome={cNome} setNome={setCNome} codigo={cCodigo} setCodigo={setCCodigo}
              file={cFile} setFile={setCFile}
              isAsicModel={cIsAsic} setIsAsicModel={setCIsAsic}
              checklistIds={cIds} setChecklistIds={setCIds}
              fotoPreviewUrl={cPreview}
            />
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setCreateOpen(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" className="flex-1 rounded-xl" disabled={saving || !cNome || !cCodigo}
                style={{ background: "linear-gradient(135deg,#1E1B4B,#8B1FA9)" }}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando…</> : "Salvar ativo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <Pencil className="h-4 w-4 text-violet-600" />
              </div>
              Editar ativo
            </DialogTitle>
            {editAsset && (
              <DialogDescription>
                Editando <span className="font-semibold text-gray-700">{editAsset.nome}</span> · {editAsset.codigo}
              </DialogDescription>
            )}
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-5 pt-2">
            <AssetFormFields
              nome={eNome} setNome={setENome} codigo={eCodigo} setCodigo={setECodigo}
              file={eFile} setFile={setEFile}
              isAsicModel={eIsAsic} setIsAsicModel={setEIsAsic}
              checklistIds={eIds} setChecklistIds={setEIds}
              fotoPreviewUrl={ePreview} currentFotoUrl={editAsset?.fotoUrl} isEdit
            />
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setEditOpen(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" className="flex-1 rounded-xl" disabled={saving || !eNome || !eCodigo}
                style={{ background: "linear-gradient(135deg,#1E1B4B,#8B1FA9)" }}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando…</> : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}