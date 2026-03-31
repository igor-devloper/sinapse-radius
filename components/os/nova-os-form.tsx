"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ATIVIDADE_CORRETIVA_LABEL, ATIVIDADES_CORRETIVAS, SUBSISTEMAS,
  PRAZO_HORAS, ATIVIDADE_REFERENCIA_MANUAL, PRAZO_SLA,
  prazoFormatado, formatarDataBR,
} from "@/lib/sla-manual";
import {
  PERIODICIDADE_LABEL, PERIODICIDADES_ORDENADAS,
  PERIODICIDADE_COR, itensPorMultiplasPeriodicidades,
} from "@/lib/checklist-preventiva";
import { addHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle, BookOpen, Clock, Upload, X, FileText,
  Image as ImageIcon, File, CalendarIcon, Zap, CheckCircle2,
  ClipboardCheck, List, Calendar, CalendarRange, Layers, Box,
  Plus, Search, Package2, ChevronDown, ChevronUp, Cpu,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Tecnico { id: string; nome: string; cargo: string; avatarUrl?: string | null; }
interface AssetExistente { id: string; nome: string; codigo: string; fotoUrl: string | null; isAsicModel?: boolean; }
interface AnexoLocal { uid: string; file: File; }
interface AssetDraft {
  itemId: string;
  mode: "nenhum" | "existente" | "novo";
  existenteId: string;
  nome: string;
  codigo: string;
  fotoFile: File | null;
  fotoPreviewUrl: string | null;
}

function buildAssetDraft(itemId: string): AssetDraft {
  return { itemId, mode: "nenhum", existenteId: "", nome: "", codigo: "", fotoFile: null, fotoPreviewUrl: null };
}

// ─── DateTimePicker ────────────────────────────────────────────────────────────
function DateTimePicker({ value, onChange, placeholder = "Selecionar data", required }: {
  value: string; onChange: (iso: string) => void; placeholder?: string; required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value) : undefined;
  const timeStr = date ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` : "";

  function handleDay(day: Date | undefined) {
    if (!day) return;
    const prev = date ?? new Date();
    day.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
    onChange(day.toISOString()); setOpen(false);
  }
  function handleTime(e: React.ChangeEvent<HTMLInputElement>) {
    const [h, m] = e.target.value.split(":").map(Number);
    const base = date ? new Date(date) : new Date();
    base.setHours(h, m, 0, 0); onChange(base.toISOString());
  }
  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className={cn("flex-1 justify-start font-normal rounded-xl border-gray-200 bg-white text-sm hover:bg-gray-50", !date && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4 text-gray-400 shrink-0" />
            {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarPicker mode="single" selected={date} onSelect={handleDay} locale={ptBR} initialFocus />
        </PopoverContent>
      </Popover>
      <div className="relative">
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input type="time" value={timeStr} onChange={handleTime} required={required}
          className="h-10 w-32 rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
      </div>
    </div>
  );
}

function DatePicker({ value, onChange, placeholder = "Selecionar data", required }: {
  value: string; onChange: (iso: string) => void; placeholder?: string; required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className={cn("w-full justify-start font-normal rounded-xl border-gray-200 bg-white text-sm hover:bg-gray-50", !date && "text-muted-foreground")}>
          <Calendar className="mr-2 h-4 w-4 text-gray-400 shrink-0" />
          {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarPicker mode="single" selected={date} onSelect={(d) => { if (d) { onChange(d.toISOString()); setOpen(false); } }} locale={ptBR} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

function FileIcon({ tipo }: { tipo: string }) {
  if (tipo.startsWith("image/")) return <ImageIcon className="w-4 h-4 text-blue-500" />;
  if (tipo === "application/pdf") return <FileText className="w-4 h-4 text-red-500" />;
  return <File className="w-4 h-4 text-gray-400" />;
}
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-600">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        {hint && <span className="text-gray-400 font-normal ml-1">({hint})</span>}
      </Label>
      {children}
    </div>
  );
}
function SectionDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-gray-100" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">{children}</span>
      <div className="h-px flex-1 bg-gray-100" />
    </div>
  );
}

// ─── Asset Dropdown (replaces the heavy per-item configurator) ─────────────────
function AssetDropdown({
  label,
  value,
  onChange,
  assetsExistentes,
  placeholder = "Selecionar ativo…",
  allowNone = true,
}: {
  label?: string;
  value: string;
  onChange: (id: string) => void;
  assetsExistentes: AssetExistente[];
  placeholder?: string;
  allowNone?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return assetsExistentes;
    return assetsExistentes.filter(
      (a) => a.nome.toLowerCase().includes(q) || a.codigo.toLowerCase().includes(q)
    );
  }, [assetsExistentes, search]);

  const selected = assetsExistentes.find((a) => a.id === value);

  return (
    <div className="space-y-1.5">
      {label && <Label className="text-xs font-medium text-gray-600">{label}</Label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-left hover:border-gray-300 transition-colors"
        >
          {selected ? (
            <>
              <div className="relative w-6 h-6 rounded overflow-hidden border border-gray-100 shrink-0">
                {selected.fotoUrl ? (
                  <Image src={selected.fotoUrl} alt={selected.nome} fill className="object-cover" sizes="24px" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-50">
                    {selected.isAsicModel ? <Cpu className="w-3 h-3 text-violet-400" /> : <Package2 className="w-3 h-3 text-gray-300" />}
                  </div>
                )}
              </div>
              <span className="flex-1 truncate font-medium text-gray-800">{selected.nome}</span>
              <span className="text-xs text-gray-400 font-mono shrink-0">{selected.codigo}</span>
              {selected.isAsicModel && (
                <Badge className="text-[9px] bg-violet-100 text-violet-700 border-violet-200 shrink-0">ASIC</Badge>
              )}
            </>
          ) : (
            <span className="flex-1 text-gray-400">{placeholder}</span>
          )}
          <ChevronDown className={cn("w-4 h-4 text-gray-400 shrink-0 transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar ativo…"
                  className="pl-9 rounded-lg h-8 text-xs"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {allowNone && (
                <button
                  type="button"
                  onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors border-b border-gray-50",
                    !value && "bg-violet-50"
                  )}
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-400 text-xs">Sem ativo vinculado</span>
                </button>
              )}
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-gray-400">Nenhum ativo encontrado</div>
              )}
              {filtered.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { onChange(a.id); setOpen(false); setSearch(""); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-violet-50 transition-colors border-b last:border-b-0 border-gray-50",
                    value === a.id && "bg-violet-50"
                  )}
                >
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border bg-gray-50 shrink-0">
                    {a.fotoUrl ? (
                      <Image src={a.fotoUrl} alt={a.nome} fill className="object-cover" sizes="32px" unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        {a.isAsicModel ? <Cpu className="w-4 h-4 text-violet-300" /> : <Package2 className="h-3.5 w-3.5 text-gray-300" />}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-800 truncate">{a.nome}</p>
                      {a.isAsicModel && <Badge className="text-[9px] bg-violet-100 text-violet-700 border-violet-200 shrink-0">ASIC</Badge>}
                    </div>
                    <p className="text-[11px] font-mono text-gray-400">{a.codigo}</p>
                  </div>
                  {value === a.id && <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Multi-asset dropdown for checklist items ──────────────────────────────────
function ChecklistAssetSection({
  itensChecklist,
  itemAssets,
  assetsExistentes,
  onItemAssetChange,
}: {
  itensChecklist: Array<{ id: string; descricao: string; periodicidade: string; subsistema: string }>;
  itemAssets: Record<string, string>;
  assetsExistentes: AssetExistente[];
  onItemAssetChange: (itemId: string, assetId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const asicAssets = assetsExistentes.filter((a) => a.isAsicModel);
  const regularAssets = assetsExistentes.filter((a) => !a.isAsicModel);

  // Group items by subsistema
  const bySubsistema = useMemo(() => {
    const groups: Record<string, typeof itensChecklist> = {};
    for (const item of itensChecklist) {
      const key = item.subsistema || "Geral";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [itensChecklist]);

  const isAsicItem = (itemId: string) => itemId.startsWith("M-");

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
            <Package2 className="w-4 h-4 text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Ativos por Item de Checklist</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {Object.values(itemAssets).filter(Boolean).length} de {itensChecklist.length} vinculados
            </p>
          </div>
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 space-y-5 border-t border-gray-50">
          {Object.entries(bySubsistema).map(([subsistema, items]) => (
            <div key={subsistema} className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 pt-3">{subsistema}</p>
              {items.map((item) => {
                const isAsic = isAsicItem(item.id);
                const relevantAssets = isAsic ? asicAssets : regularAssets.length > 0 ? regularAssets : assetsExistentes;
                return (
                  <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-[10px] text-violet-400 shrink-0 mt-0.5 w-12">{item.id}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 leading-snug">{item.descricao}</p>
                        <p className="text-[10px] text-gray-400">{item.periodicidade}</p>
                      </div>
                      {isAsic && (
                        <Badge className="text-[9px] bg-violet-100 text-violet-700 border-violet-200 shrink-0">ASIC</Badge>
                      )}
                    </div>
                    <AssetDropdown
                      value={itemAssets[item.id] ?? ""}
                      onChange={(id) => onItemAssetChange(item.id, id)}
                      assetsExistentes={relevantAssets}
                      placeholder={isAsic ? "Selecionar modelo ASIC…" : "Selecionar ativo…"}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export function NovaOSForm({
  tecnicos,
  assetsExistentes = [],
}: {
  tecnicos: Tecnico[];
  usuarioId: string;
  assetsExistentes?: AssetExistente[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tipoOS, setTipoOS] = useState<"" | "PREVENTIVA" | "CORRETIVA">("");

  // Preventiva
  const [prevForm, setPrevForm] = useState({
    periodicidadesSelecionadas: [] as string[],
    titulo: "", prioridade: "MEDIA",
    dataProgramada: "", dataFimProgramada: "",
    containerId: "", responsavelId: "",
  });

  // itemAssets: itemId → assetId (string, not full draft)
  const [itemAssets, setItemAssets] = useState<Record<string, string>>({});

  // Corretiva
  const [corrForm, setCorrForm] = useState({
    tipoAtividadeCorretiva: "", titulo: "", descricao: "", motivoOS: "",
    prioridade: "MEDIA", dataEmissaoAxia: "", dataProgramada: "",
    subsistema: "Geral", componenteTag: "", containerId: "", responsavelId: "",
  });

  const [anexos, setAnexos] = useState<AnexoLocal[]>([]);

  function setPrev(k: string, v: string | string[]) { setPrevForm((f) => ({ ...f, [k]: v })); }
  function setCorr(k: string, v: string) { setCorrForm((f) => ({ ...f, [k]: v })); }
  function setItemAsset(itemId: string, assetId: string) {
    setItemAssets((p) => ({ ...p, [itemId]: assetId }));
  }

  function togglePeriodicidade(per: string) {
    setPrevForm((f) => {
      const sels = f.periodicidadesSelecionadas;
      const novo = sels.includes(per) ? sels.filter((p) => p !== per) : [...sels, per];
      return { ...f, periodicidadesSelecionadas: novo };
    });
    setShowChecklist(true);
  }

  const prazoConfig = corrForm.tipoAtividadeCorretiva ? PRAZO_SLA[corrForm.tipoAtividadeCorretiva] : null;
  const prazoHoras = prazoConfig?.resolucaoHoras ?? null;
  const atuacaoHoras = prazoConfig?.atuacaoHoras ?? null;
  const dataLimitePreview = corrForm.dataEmissaoAxia && prazoHoras ? addHours(new Date(corrForm.dataEmissaoAxia), prazoHoras) : null;
  const dataAtuacaoPreview = corrForm.dataEmissaoAxia && atuacaoHoras ? addHours(new Date(corrForm.dataEmissaoAxia), atuacaoHoras) : null;

  const itensChecklist = useMemo(
    () => itensPorMultiplasPeriodicidades(prevForm.periodicidadesSelecionadas),
    [prevForm.periodicidadesSelecionadas]
  );

  // Clean up removed items
  useEffect(() => {
    const itemIds = new Set(itensChecklist.map((i) => i.id));
    setItemAssets((prev) => {
      const next: Record<string, string> = {};
      for (const id of itemIds) next[id] = prev[id] ?? "";
      return next;
    });
  }, [itensChecklist]);

  const prioridadeAuto = useMemo(() => {
    if (prevForm.periodicidadesSelecionadas.some((p) => ["ANUAL", "SEMESTRAL"].includes(p))) return "ALTA";
    return "MEDIA";
  }, [prevForm.periodicidadesSelecionadas]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    setAnexos((prev) => [...prev, ...Array.from(files).map((file) => ({ uid: crypto.randomUUID(), file }))]);
  }
  function removeAnexo(uid: string) { setAnexos((prev) => prev.filter((a) => a.uid !== uid)); }
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      let payload: Record<string, unknown>;

      if (tipoOS === "PREVENTIVA") {
        // Build checklistAssets from simple itemAssets map
        const checklistAssets = Object.entries(itemAssets)
          .filter(([, assetId]) => !!assetId)
          .map(([itemId, assetId]) => ({ itemId, assetId }));

        payload = {
          tipoOS: "PREVENTIVA",
          periodicidadesSelecionadas: prevForm.periodicidadesSelecionadas,
          titulo: prevForm.titulo || undefined,
          prioridade: prevForm.prioridade || prioridadeAuto,
          dataProgramada: new Date(prevForm.dataProgramada).toISOString(),
          dataFimProgramada: prevForm.dataFimProgramada ? new Date(prevForm.dataFimProgramada).toISOString() : undefined,
          subsistema: "Geral",
          containerId: prevForm.containerId || undefined,
          responsavelId: prevForm.responsavelId || undefined,
          checklistAssets,
        };
      } else {
        payload = {
          tipoOS: "CORRETIVA",
          tipoAtividadeCorretiva: corrForm.tipoAtividadeCorretiva,
          titulo: corrForm.titulo, descricao: corrForm.descricao,
          motivoOS: corrForm.motivoOS, prioridade: corrForm.prioridade,
          dataEmissaoAxia: new Date(corrForm.dataEmissaoAxia).toISOString(),
          dataProgramada: corrForm.dataProgramada ? new Date(corrForm.dataProgramada).toISOString() : undefined,
          subsistema: corrForm.subsistema,
          componenteTag: corrForm.componenteTag || undefined,
          containerId: corrForm.containerId || undefined,
          responsavelId: corrForm.responsavelId || undefined,
        };
      }

      const res = await fetch("/api/os", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.formErrors?.[0] ?? "Erro ao criar OS");

      if (anexos.length > 0) {
        await Promise.all(anexos.map(({ file }) => {
          const fd = new FormData(); fd.append("file", file);
          return fetch(`/api/os/${data.os.id}/anexos`, { method: "POST", body: fd });
        }));
      }
      router.push(`/ordens/${data.os.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally { setLoading(false); }
  }

  const canSubmit = tipoOS === "PREVENTIVA"
    ? prevForm.periodicidadesSelecionadas.length > 0 && !!prevForm.dataProgramada
    : tipoOS === "CORRETIVA"
    ? !!corrForm.tipoAtividadeCorretiva && !!corrForm.titulo && !!corrForm.dataEmissaoAxia
    : false;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Tipo OS */}
      <div className="grid grid-cols-2 gap-4">
        <button type="button" onClick={() => { setTipoOS("PREVENTIVA"); setShowChecklist(false); }}
          className={cn("rounded-2xl border-2 p-5 text-left transition-all space-y-2",
            tipoOS === "PREVENTIVA" ? "border-purple-500 bg-purple-50" : "border-gray-200 bg-white hover:border-purple-200")}>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: tipoOS === "PREVENTIVA" ? "#8B1FA9" : "#f3f4f6" }}>
              <ClipboardCheck className="w-5 h-5" style={{ color: tipoOS === "PREVENTIVA" ? "white" : "#9ca3af" }} />
            </div>
            <div>
              <p className={cn("text-sm font-bold", tipoOS === "PREVENTIVA" ? "text-purple-800" : "text-gray-800")}>Manutenção Preventiva</p>
              <p className="text-xs text-gray-400">Sem SLA — visita programada</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Checklist unificado por periodicidade. Ativos vinculados aos itens.</p>
        </button>
        <button type="button" onClick={() => setTipoOS("CORRETIVA")}
          className={cn("rounded-2xl border-2 p-5 text-left transition-all space-y-2",
            tipoOS === "CORRETIVA" ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-white hover:border-orange-200")}>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: tipoOS === "CORRETIVA" ? "#ea580c" : "#f3f4f6" }}>
              <Zap className="w-5 h-5" style={{ color: tipoOS === "CORRETIVA" ? "white" : "#9ca3af" }} />
            </div>
            <div>
              <p className={cn("text-sm font-bold", tipoOS === "CORRETIVA" ? "text-orange-800" : "text-gray-800")}>Corretiva / Emergencial</p>
              <p className="text-xs text-gray-400">SLA via Contrato Axia §1.3.4</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Para falhas, alarmes e substituições. SLA contratual aplicado.</p>
        </button>
      </div>

      {/* ── PREVENTIVA ─────────────────────────────────────────────────── */}
      {tipoOS === "PREVENTIVA" && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <SectionDivider>Datas da Visita</SectionDivider>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Data de início" required>
                <DatePicker value={prevForm.dataProgramada} onChange={(iso) => setPrev("dataProgramada", iso)} placeholder="Selecionar data" required />
              </Field>
              <Field label="Data de fim" hint="opcional">
                <DatePicker value={prevForm.dataFimProgramada} onChange={(iso) => setPrev("dataFimProgramada", iso)} placeholder="Mesmo dia" />
              </Field>
            </div>
          </div>

          <div className="bg-purple-50 rounded-2xl border border-purple-100 p-6 space-y-4">
            <SectionDivider>Periodicidades desta Visita</SectionDivider>
            <p className="text-xs text-gray-500 -mt-2">Selecione todas as periodicidades que serão executadas nesta visita.</p>
            <div className="grid grid-cols-2 gap-2">
              {PERIODICIDADES_ORDENADAS.map((per) => {
                const cor = PERIODICIDADE_COR[per];
                const sel = prevForm.periodicidadesSelecionadas.includes(per);
                const qtd = itensPorMultiplasPeriodicidades([per]).length;
                return (
                  <button key={per} type="button" onClick={() => togglePeriodicidade(per)}
                    className={cn("rounded-xl border px-3 py-2.5 text-left transition-all text-xs font-medium",
                      sel ? `${cor.bg} ${cor.text} ${cor.border} ring-2 ring-offset-1 ring-violet-300` : "border-gray-200 bg-white hover:border-gray-300")}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{PERIODICIDADE_LABEL[per]}</span>
                      {sel && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                    </div>
                    <span className={cn("text-[10px] font-normal", sel ? cor.text : "text-gray-400")}>{qtd} item{qtd !== 1 ? "s" : ""} próprios</span>
                  </button>
                );
              })}
            </div>
            {prevForm.periodicidadesSelecionadas.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Layers className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                <span className="text-xs text-violet-700 font-medium">Selecionado:</span>
                {prevForm.periodicidadesSelecionadas.map((p) => {
                  const cor = PERIODICIDADE_COR[p];
                  return <span key={p} className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", cor.bg, cor.text, cor.border)}>{PERIODICIDADE_LABEL[p]}</span>;
                })}
              </div>
            )}
            {prevForm.periodicidadesSelecionadas.length > 0 && showChecklist && itensChecklist.length > 0 && (
              <div className="bg-white rounded-xl border border-purple-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                    <List className="w-4 h-4" /> {itensChecklist.length} itens serão gerados
                  </p>
                  <button type="button" onClick={() => setShowChecklist(false)} className="text-xs text-purple-500 hover:underline">ocultar</button>
                </div>
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {itensChecklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-xs text-purple-700">
                      <span className="font-mono text-purple-400 shrink-0 w-12">{item.id}</span>
                      <span className="flex-1 truncate">{item.descricao}</span>
                      <span className="shrink-0 text-purple-400 text-[10px]">{item.periodicidade}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {prevForm.periodicidadesSelecionadas.length > 0 && !showChecklist && (
              <button type="button" onClick={() => setShowChecklist(true)} className="text-xs text-purple-500 hover:underline flex items-center gap-1">
                <List className="w-3.5 h-3.5" /> Ver {itensChecklist.length} itens
              </button>
            )}
          </div>

          {/* Ativos por item — agora como dropdown */}
          {itensChecklist.length > 0 && assetsExistentes.length > 0 && (
            <ChecklistAssetSection
              itensChecklist={itensChecklist}
              itemAssets={itemAssets}
              assetsExistentes={assetsExistentes}
              onItemAssetChange={setItemAsset}
            />
          )}

          {/* ASIC miners notice */}
          {itensChecklist.some((i) => i.id.startsWith("M-")) && (
            <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3.5">
              <Cpu className="w-5 h-5 text-violet-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-violet-800">Verificação de Miners incluída</p>
                <p className="text-xs text-violet-600 mt-0.5">
                  Os itens M-001, M-002 e M-003 incluem verificação de ASICs. Após abrir a OS, use a aba <strong>Miners</strong> para registrar o status de cada máquina por SN.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <SectionDivider>Dados Adicionais</SectionDivider>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Título personalizado">
                <Input value={prevForm.titulo} onChange={(e) => setPrev("titulo", e.target.value)}
                  className="rounded-xl border-gray-200 focus-visible:ring-purple-300" placeholder="Gerado automaticamente" />
              </Field>
              <Field label="Container ID">
                <Input value={prevForm.containerId} onChange={(e) => setPrev("containerId", e.target.value)}
                  className="rounded-xl border-gray-200 focus-visible:ring-purple-300" placeholder="HK3-01" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prioridade" required>
                <Select value={prevForm.prioridade || prioridadeAuto} onValueChange={(v) => setPrev("prioridade", v)}>
                  <SelectTrigger className="rounded-xl border-gray-200 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAIXA">Baixa</SelectItem>
                    <SelectItem value="MEDIA">Média</SelectItem>
                    <SelectItem value="ALTA">Alta</SelectItem>
                    <SelectItem value="CRITICA">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Técnico responsável">
                <Select value={prevForm.responsavelId} onValueChange={(v) => setPrev("responsavelId", v)}>
                  <SelectTrigger className="rounded-xl border-gray-200 bg-white">
                    <SelectValue placeholder="Selecionar…" />
                  </SelectTrigger>
                  <SelectContent>
                    {tecnicos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50 px-5 py-4 flex items-start gap-3">
            <CalendarRange className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-purple-800">Uma visita, múltiplas periodicidades</p>
              <p className="text-xs text-purple-600 mt-0.5">O checklist será unificado. A OS aparecerá no Gantt em todas as linhas correspondentes.</p>
            </div>
          </div>
        </>
      )}

      {/* ── CORRETIVA ──────────────────────────────────────────────────── */}
      {tipoOS === "CORRETIVA" && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <SectionDivider>Tipo de Falha / Ocorrência</SectionDivider>
            <Field label="Selecionar ocorrência" required>
              <Select required value={corrForm.tipoAtividadeCorretiva} onValueChange={(v) => setCorr("tipoAtividadeCorretiva", v)}>
                <SelectTrigger className="rounded-xl border-gray-200 bg-white">
                  <SelectValue placeholder="Selecionar tipo de falha…" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {ATIVIDADES_CORRETIVAS.map((a) => (
                    <SelectItem key={a} value={a}>
                      <span>{ATIVIDADE_CORRETIVA_LABEL[a]}</span>
                      <span className="text-gray-400 text-xs ml-1">({prazoFormatado(PRAZO_HORAS[a])})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {corrForm.tipoAtividadeCorretiva && (
                <div className="flex items-center gap-1.5 text-xs bg-orange-50 text-orange-700 rounded-lg px-3 py-1.5 mt-1 border border-orange-100">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  {ATIVIDADE_REFERENCIA_MANUAL[corrForm.tipoAtividadeCorretiva]}
                  {prazoHoras && <span className="ml-auto font-semibold">{prazoFormatado(prazoHoras)} resolução</span>}
                </div>
              )}
            </Field>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <SectionDivider>Identificação</SectionDivider>
            <Field label="Título da OS" required>
              <Input required value={corrForm.titulo} onChange={(e) => setCorr("titulo", e.target.value)}
                className="rounded-xl border-gray-200 focus-visible:ring-purple-300"
                placeholder="Ex: Falha bomba circulação P01 — container HK3-01" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prioridade" required>
                <Select value={corrForm.prioridade} onValueChange={(v) => setCorr("prioridade", v)}>
                  <SelectTrigger className="rounded-xl border-gray-200 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAIXA">Baixa</SelectItem>
                    <SelectItem value="MEDIA">Média</SelectItem>
                    <SelectItem value="ALTA">Alta</SelectItem>
                    <SelectItem value="CRITICA">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Container ID">
                <Input value={corrForm.containerId} onChange={(e) => setCorr("containerId", e.target.value)}
                  className="rounded-xl border-gray-200 focus-visible:ring-purple-300" placeholder="HK3-01" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Subsistema" required>
                <Select required value={corrForm.subsistema} onValueChange={(v) => setCorr("subsistema", v)}>
                  <SelectTrigger className="rounded-xl border-gray-200 bg-white"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                  <SelectContent>{SUBSISTEMAS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="TAG do componente">
                <Input value={corrForm.componenteTag} onChange={(e) => setCorr("componenteTag", e.target.value)}
                  className="rounded-xl border-gray-200 focus-visible:ring-purple-300" placeholder="P01, G04" />
              </Field>
            </div>

            {/* Asset dropdown for corretiva */}
            {assetsExistentes.length > 0 && (
              <AssetDropdown
                label="Ativo relacionado"
                value={itemAssets["corretiva"] ?? ""}
                onChange={(id) => setItemAsset("corretiva", id)}
                assetsExistentes={assetsExistentes}
                placeholder="Selecionar ativo relacionado à falha…"
              />
            )}
          </div>

          <div className="rounded-2xl border p-6 space-y-4" style={{ background: "linear-gradient(135deg,#fff7ed,#fef3c7)", borderColor: "#fed7aa" }}>
            <SectionDivider>SLA Contratual — Axia §1.3.4</SectionDivider>
            <Field label="Data e hora de emissão da OS — Axia (CONTRATANTE)" required>
              <DateTimePicker value={corrForm.dataEmissaoAxia} onChange={(iso) => setCorr("dataEmissaoAxia", iso)} placeholder="Selecionar data e hora" required />
            </Field>
            {dataLimitePreview && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between bg-white/80 rounded-xl px-4 py-2.5 border border-orange-100">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /><span className="text-xs text-gray-500">Prazo de resolução</span></div>
                  <span className="text-sm font-bold text-orange-700">{format(dataLimitePreview, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
                {dataAtuacaoPreview && (
                  <div className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">
                    <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-red-500" /><span className="text-xs text-gray-500">Prazo de atuação</span></div>
                    <span className="text-sm font-bold text-red-700">{format(dataAtuacaoPreview, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                )}
              </div>
            )}
            <Field label="Data programada para execução">
              <DateTimePicker value={corrForm.dataProgramada} onChange={(iso) => setCorr("dataProgramada", iso)} placeholder="Opcional" />
            </Field>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <SectionDivider>Detalhes</SectionDivider>
            <Field label="Descrição da ocorrência" required>
              <Textarea required rows={3} value={corrForm.descricao} onChange={(e) => setCorr("descricao", e.target.value)}
                className="rounded-xl border-gray-200 focus-visible:ring-purple-300 resize-none"
                placeholder="Descreva o escopo e o problema identificado…" />
            </Field>
            <Field label="Motivo / Sintoma observado" required>
              <Textarea required rows={3} value={corrForm.motivoOS} onChange={(e) => setCorr("motivoOS", e.target.value)}
                className="rounded-xl border-gray-200 focus-visible:ring-purple-300 resize-none"
                placeholder="Ex: Alarme ativo PT02 abaixo de 0,05 MPa…" />
            </Field>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <SectionDivider>Responsável</SectionDivider>
            <Field label="Técnico responsável">
              <Select value={corrForm.responsavelId} onValueChange={(v) => setCorr("responsavelId", v)}>
                <SelectTrigger className="rounded-xl border-gray-200 bg-white"><SelectValue placeholder="Selecionar responsável…" /></SelectTrigger>
                <SelectContent>
                  {tecnicos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome} <span className="text-xs text-gray-400 ml-1 capitalize">({t.cargo.toLowerCase()})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </>
      )}

      {/* Anexos */}
      {tipoOS && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <SectionDivider>Anexos (opcional)</SectionDivider>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn("border-2 border-dashed rounded-2xl px-6 py-8 flex flex-col items-center gap-3 cursor-pointer transition-all",
              dragOver ? "border-purple-400 bg-purple-50" : "border-gray-200 hover:border-purple-300 hover:bg-gray-50")}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#F3E8FF" }}>
              <Upload className="w-5 h-5" style={{ color: "#8B1FA9" }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Arraste arquivos ou clique para selecionar</p>
              <p className="text-xs text-gray-400 mt-0.5">Imagens e PDF — máx 10 MB por arquivo</p>
            </div>
            <input ref={fileInputRef} type="file" multiple className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => addFiles(e.target.files)} />
          </div>
          {anexos.length > 0 && (
            <div className="space-y-2">
              {anexos.map(({ uid, file }) => (
                <div key={uid} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 group">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-200 shrink-0">
                    <FileIcon tipo={file.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                  </div>
                  <button type="button" onClick={() => removeAnexo(uid)} className="p-1 hover:bg-gray-200 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()}
          className="flex-1 py-3 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium">
          Cancelar
        </button>
        <button type="submit" disabled={loading || !canSubmit}
          className="flex-1 py-3 text-sm text-white font-semibold rounded-xl disabled:opacity-40 transition-all"
          style={{ background: loading ? "#9ca3af" : "linear-gradient(135deg,#1E1B4B 0%,#8B1FA9 100%)" }}>
          {loading ? "Abrindo OS…" : "Abrir Ordem de Serviço"}
        </button>
      </div>
    </form>
  );
}