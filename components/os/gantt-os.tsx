"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import {
  format, startOfMonth, endOfMonth, eachMonthOfInterval, eachWeekOfInterval,
  endOfWeek, startOfWeek, isAfter, isBefore, isSameMonth, setDate, getYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import {
  Plus, Loader2, CheckCircle2, AlertTriangle, X, Calendar, CalendarRange, Layers,
  Download, FileSpreadsheet, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  PERIODICIDADE_LABEL, PERIODICIDADES_ORDENADAS, PERIODICIDADE_COR,
  itensPorMultiplasPeriodicidades, CHECKLIST_PREVENTIVA, ChecklistItem,
} from "@/lib/checklist-preventiva";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

interface OSResumida {
  id: string; numero: string; titulo: string; status: string;
  periodicidadePreventiva?: string | null;
  periodicidadesSelecionadas?: string[];
  dataProgramada?: Date | string | null;
  dataFimProgramada?: Date | string | null;
  dataConclusao?: Date | string | null;
  tipoOS: string;
}

type ViewMode = "mensal" | "semanal";

type Column = {
  key: string; label: string; sublabel: string;
  start: Date; end: Date; dueAnchor: Date; isCurrent: boolean;
};

interface SlotItem {
  item: ChecklistItem; col: Column; os: OSResumida | null; esperado: boolean;
}

const STATUS_COR: Record<string, { bg: string; label: string }> = {
  ABERTA:          { bg: "bg-orange-400", label: "Aberta" },
  EM_ANDAMENTO:    { bg: "bg-violet-500", label: "Em andamento" },
  AGUARDANDO_PECA: { bg: "bg-yellow-400", label: "Aguard. peça" },
  PAUSADA:         { bg: "bg-gray-400", label: "Pausada" },
  CONCLUIDA:       { bg: "bg-green-500", label: "Concluída" },
  CANCELADA:       { bg: "bg-red-300", label: "Cancelada" },
};

const PERIODICIDADE_TEXTO_PARA_ENUM: Record<string, string> = {
  Mensal: "MENSAL", Semanal: "SEMANAL", "2 meses": "HORAS_2000",
  Trimestral: "TRIMESTRAL", Semestral: "SEMESTRAL", Anual: "ANUAL", "A cada 1-2 anos": "BIENNIAL",
};

function itemPeriodicidadeEnum(item: ChecklistItem): string {
  return PERIODICIDADE_TEXTO_PARA_ENUM[item.periodicidade] ?? item.periodicidade.toUpperCase();
}

function dueMonthsForPeriodicidade(periodicidade: string) {
  switch (periodicidade) {
    case "MENSAL": return [1,2,3,4,5,6,7,8,9,10,11,12];
    case "HORAS_2000": return [2,4,6,8,10,12];
    case "TRIMESTRAL": return [3,6,9,12];
    case "SEMESTRAL": return [6,12];
    case "ANUAL": case "BIENNIAL": return [12];
    default: return [];
  }
}

function getPeriodicidadesOS(os: OSResumida): string[] {
  if (os.periodicidadesSelecionadas && os.periodicidadesSelecionadas.length > 0) return os.periodicidadesSelecionadas;
  if (os.periodicidadePreventiva) return [os.periodicidadePreventiva];
  return [];
}

function periodicidadesEsperadasNoMes(mes: Date): string[] {
  const month = mes.getMonth() + 1;
  const result = ["MENSAL"];
  if (month % 2 === 0) result.push("HORAS_2000");
  if (month % 3 === 0) result.push("TRIMESTRAL");
  if (month === 6 || month === 12) result.push("SEMESTRAL");
  if (month === 12) result.push("ANUAL");
  return result;
}

function DatePickerSimples({ value, onChange, placeholder = "Selecionar data" }: {
  value: string; onChange: (iso: string) => void; placeholder?: string;
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

function ModalCriarOS({ mes, periodicidadesIniciais, onClose, onCriada }: {
  mes: Date; periodicidadesIniciais: string[];
  onClose: () => void; onCriada: (os: OSResumida) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [periodicidadesSelecionadas, setPeriodicidadesSelecionadas] = useState<string[]>(periodicidadesIniciais);
  const [dataInicio, setDataInicio] = useState(() => {
    const d = setDate(mes, 1); d.setHours(8, 0, 0, 0); return d.toISOString();
  });
  const [dataFim, setDataFim] = useState("");

  function togglePeriodicidade(per: string) {
    setPeriodicidadesSelecionadas((prev) => prev.includes(per) ? prev.filter((p) => p !== per) : [...prev, per]);
  }

  const itensPreview = useMemo(() => itensPorMultiplasPeriodicidades(periodicidadesSelecionadas), [periodicidadesSelecionadas]);
  const prioridade = useMemo(() => periodicidadesSelecionadas.some((p) => ["ANUAL","SEMESTRAL"].includes(p)) ? "ALTA" : "MEDIA", [periodicidadesSelecionadas]);

  async function criar() {
    if (periodicidadesSelecionadas.length === 0) { toast.error("Selecione ao menos uma periodicidade"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/os", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoOS: "PREVENTIVA", periodicidadesSelecionadas, dataProgramada: dataInicio, dataFimProgramada: dataFim || undefined, subsistema: "Geral", prioridade }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json?.error?.formErrors?.[0] ?? json?.error ?? "Erro ao criar OS"); return; }
      toast.success(`OS ${json.os.numero} criada com sucesso!`);
      onCriada(json.os); onClose(); router.refresh();
    } catch { toast.error("Erro de conexão ao criar OS"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><Layers className="w-4 h-4 text-violet-600" />Nova OS — Visita Preventiva</h2>
            <p className="text-xs text-gray-400 mt-0.5">{format(mes, "MMMM 'de' yyyy", { locale: ptBR })}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5"><CalendarRange className="w-3.5 h-3.5" /> Datas da visita</label>
            <div className="space-y-2">
              <div><p className="text-xs text-gray-400 mb-1">Início</p><DatePickerSimples value={dataInicio} onChange={setDataInicio} placeholder="Data de início" /></div>
              <div><p className="text-xs text-gray-400 mb-1">Fim (opcional)</p><DatePickerSimples value={dataFim} onChange={setDataFim} placeholder="Data de fim" /></div>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-600">Periodicidades desta visita</label>
            <div className="grid grid-cols-2 gap-2">
              {PERIODICIDADES_ORDENADAS.map((per) => {
                const cor = PERIODICIDADE_COR[per];
                const sel = periodicidadesSelecionadas.includes(per);
                return (
                  <button key={per} type="button" onClick={() => togglePeriodicidade(per)}
                    className={cn("rounded-xl border px-3 py-2.5 text-left transition-all text-xs font-medium",
                      sel ? `${cor.bg} ${cor.text} ${cor.border} ring-2 ring-offset-1 ring-violet-300` : "border-gray-200 bg-white hover:border-gray-300")}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{PERIODICIDADE_LABEL[per]}</span>
                      {sel && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                    </div>
                    <span className={cn("text-[10px] font-normal", sel ? cor.text : "text-gray-400")}>{itensPorMultiplasPeriodicidades([per]).length} itens</span>
                  </button>
                );
              })}
            </div>
          </div>
          {periodicidadesSelecionadas.length > 0 && (
            <div className="bg-violet-50 rounded-xl border border-violet-100 p-4 space-y-2">
              <p className="text-xs font-semibold text-violet-800">{itensPreview.length} itens serão gerados</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {itensPreview.map((item) => (
                  <div key={item.id} className="flex items-center gap-1.5 text-xs text-violet-700">
                    <span className="font-mono text-violet-400 shrink-0 w-10">{item.id}</span>
                    <span className="flex-1 truncate">{item.descricao}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cancelar</button>
            <button type="button" onClick={criar} disabled={loading || periodicidadesSelecionadas.length === 0}
              className="flex-1 py-2.5 text-sm text-white font-semibold rounded-xl disabled:opacity-40 transition-all"
              style={{ background: "linear-gradient(135deg,#1E1B4B 0%,#8B1FA9 100%)" }}>
              {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Criando…</span> : "Criar OS"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildColumns(year: number, viewMode: ViewMode): Column[] {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  if (viewMode === "mensal") {
    return eachMonthOfInterval({ start, end }).map((month) => ({
      key: format(month, "yyyy-MM"),
      label: format(month, "MMM", { locale: ptBR }),
      sublabel: format(month, "yy"),
      start: startOfMonth(month), end: endOfMonth(month),
      dueAnchor: startOfMonth(month),
      isCurrent: isSameMonth(month, new Date()),
    }));
  }
  return eachWeekOfInterval({ start, end }, { weekStartsOn: 0 }).map((weekStart, idx) => ({
    key: `${year}-W${String(idx + 1).padStart(2, "0")}`,
    label: `S${idx + 1}`, sublabel: format(weekStart, "dd/MM"),
    start: startOfWeek(weekStart, { weekStartsOn: 0 }),
    end: endOfWeek(weekStart, { weekStartsOn: 0 }),
    dueAnchor: startOfWeek(weekStart, { weekStartsOn: 0 }),
    isCurrent: new Date() >= startOfWeek(weekStart, { weekStartsOn: 0 }) && new Date() <= endOfWeek(weekStart, { weekStartsOn: 0 }),
  }));
}

function isExpectedForColumn(col: Column, item: ChecklistItem, viewMode: ViewMode) {
  const per = itemPeriodicidadeEnum(item);
  const dueMonths = dueMonthsForPeriodicidade(per);
  const month = col.dueAnchor.getMonth() + 1;
  if (!dueMonths.includes(month)) return false;
  if (viewMode === "mensal") return true;
  return col.dueAnchor.getDate() <= 7;
}

function classifySlotItem(slot: SlotItem): "atrasada" | "atual" | "futura" | "concluida" | "nao_esperado" {
  if (!slot.esperado) return "nao_esperado";
  if (!slot.os) {
    if (isBefore(slot.col.end, startOfMonth(new Date()))) return "atrasada";
    if (slot.col.isCurrent) return "atual";
    return "futura";
  }
  if (slot.os.status === "CONCLUIDA") return "concluida";
  if (isBefore(slot.col.end, startOfMonth(new Date()))) return "atrasada";
  if (slot.col.isCurrent) return "atual";
  return "futura";
}

function BadgeYear({ year }: { year: number }) {
  return <div className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700">{year}</div>;
}

// ─── Export helpers ────────────────────────────────────────────────────────────
function exportGanttCSV(
  tabela: Array<{ item: ChecklistItem; slots: SlotItem[] }>,
  columns: Column[],
  year: number
) {
  const MONTHS = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const header = ["ID", "Descrição", "Subsistema", "Periodicidade", ...columns.map((c) => c.label + "/" + c.sublabel)];
  const rows = tabela.map(({ item, slots }) => {
    const cells = slots.map((slot) => {
      if (!slot.esperado) return "-";
      if (!slot.os) return "Pendente";
      if (slot.os.status === "CONCLUIDA") return "Concluído";
      if (slot.os.status === "CANCELADA") return "Cancelado";
      return slot.os.numero;
    });
    return [item.id, item.descricao, item.subsistema, item.periodicidade, ...cells];
  });
  const csv = [header, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `gantt_preventivas_${year}.csv`;
  a.click(); URL.revokeObjectURL(url);
  toast.success("Planilha exportada com sucesso");
}

async function exportGanttPNG(tableRef: React.RefObject<HTMLDivElement | null>, year: number) {
  try {
    const { default: html2canvas } = await import("html2canvas");
    if (!tableRef.current) return;
    toast.info("Gerando imagem…");
    const canvas = await html2canvas(tableRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url; a.download = `gantt_preventivas_${year}.png`;
    a.click();
    toast.success("Imagem exportada");
  } catch {
    toast.error("Erro ao exportar imagem. Tente exportar como CSV.");
  }
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function GanttOS({ ordens: ordensInicial }: { ordens: OSResumida[] }) {
  const currentYear = getYear(new Date());
  const [year, setYear] = useState(currentYear);
  const [viewMode, setViewMode] = useState<ViewMode>("mensal");
  const [ordensLocais, setOrdensLocais] = useState<OSResumida[]>(ordensInicial);
  const [modalState, setModalState] = useState<{ periodicidades: string[]; mes: Date } | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const columns = useMemo(() => buildColumns(year, viewMode), [year, viewMode]);
  const preventivas = useMemo(() => ordensLocais.filter((o) => o.tipoOS === "PREVENTIVA"), [ordensLocais]);

  const tabela = useMemo(() =>
    CHECKLIST_PREVENTIVA.map((item) => {
      const periodicidadeEnum = itemPeriodicidadeEnum(item);
      const slots = columns.map((col) => {
        const esperado = isExpectedForColumn(col, item, viewMode);
        const os = preventivas.find((o) => {
          if (!o.dataProgramada) return false;
          const data = new Date(o.dataProgramada);
          const periods = getPeriodicidadesOS(o);
          return periods.includes(periodicidadeEnum) && data >= col.start && data <= col.end;
        }) ?? null;
        return { item, col, os, esperado } satisfies SlotItem;
      });
      return { item, slots };
    }), [columns, preventivas, viewMode]);

  const subsistemaGroups = useMemo(() => {
    const map = new Map<string, typeof tabela>();
    for (const row of tabela) {
      const sub = row.item.subsistema;
      if (!map.has(sub)) map.set(sub, []);
      map.get(sub)!.push(row);
    }
    return Array.from(map.entries());
  }, [tabela]);

  const totalFaltando = useMemo(() => {
    let count = 0;
    tabela.forEach(({ slots }) => slots.forEach((s) => {
      if (s.esperado && !s.os && !isAfter(s.col.start, endOfMonth(new Date(year, 11, 31)))) count++;
    }));
    return count;
  }, [tabela, year]);

  const handleCriada = useCallback((novaOS: OSResumida) => setOrdensLocais((prev) => [...prev, novaOS]), []);

  const COL_ID = 48;
  const COL_DESC = 260;
  const COL_PERIOD = 90;
  const COL_SLOT = 44;
  const totalWidth = COL_ID + COL_DESC + COL_PERIOD + columns.length * COL_SLOT;

  return (
    <>
      {modalState && (
        <ModalCriarOS
          mes={modalState.mes} periodicidadesIniciais={modalState.periodicidades}
          onClose={() => setModalState(null)} onCriada={handleCriada}
        />
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-gray-50 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Cronograma de Preventivas</h3>
            <p className="text-xs text-gray-400 mt-0.5">Ano completo. A visita multi-periodicidade marca todas as linhas que ela cobre.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={viewMode === "mensal" ? "default" : "outline"} size="sm" onClick={() => setViewMode("mensal")}>Mensal</Button>
            <Button variant={viewMode === "semanal" ? "default" : "outline"} size="sm" onClick={() => setViewMode("semanal")}>Semanal</Button>
            <Button variant="outline" size="sm" onClick={() => setYear((y) => y - 1)}>←</Button>
            <BadgeYear year={year} />
            <Button variant="outline" size="sm" onClick={() => setYear((y) => y + 1)}>→</Button>
            {totalFaltando > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />{totalFaltando} pendência(s)
              </div>
            )}
            {/* Export dropdown */}
            <div className="relative">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setExportMenuOpen((v) => !v)}>
                <Download className="w-3.5 h-3.5" /> Exportar
              </Button>
              {exportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setExportMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-40 min-w-[180px] bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                    <button
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => { exportGanttCSV(tabela, columns, year); setExportMenuOpen(false); }}>
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      Exportar como CSV
                    </button>
                    <button
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                      onClick={() => { exportGanttPNG(tableRef, year); setExportMenuOpen(false); }}>
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      Exportar como PNG
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="px-5 py-2.5 flex items-center gap-4 flex-wrap border-b border-gray-50 bg-gray-50/40 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />Concluída</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-500 inline-block" />Aberta / andamento</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />Atrasada</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm border-2 border-dashed border-gray-300 inline-block" />Falta criar OS</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto" ref={tableRef}>
          <table
            className="border-collapse"
            style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px`, tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: COL_ID }} />
              <col style={{ width: COL_DESC }} />
              <col style={{ width: COL_PERIOD }} />
              {columns.map((col) => <col key={col.key} style={{ width: COL_SLOT }} />)}
            </colgroup>
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-2 py-2.5 text-xs font-semibold text-gray-500 bg-white"
                  style={{ position: "sticky", left: 0, zIndex: 20, width: COL_ID }}>ID</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 bg-white"
                  style={{ position: "sticky", left: COL_ID, zIndex: 20, width: COL_DESC }}>Descrição</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 bg-white" style={{ width: COL_PERIOD }}>Período</th>
                {columns.map((col) => (
                  <th key={col.key}
                    className={cn("text-center px-0 py-2.5 text-xs font-medium", col.isCurrent ? "text-violet-700 bg-violet-50/70" : "text-gray-400 bg-white")}
                    style={{ width: COL_SLOT }}>
                    <div className="flex flex-col items-center gap-0.5 leading-none">
                      <span className="truncate w-full text-center">{col.label}</span>
                      <span className={cn("text-[9px]", col.isCurrent ? "text-violet-500 font-bold" : "text-gray-300")}>{col.sublabel}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subsistemaGroups.map(([subsistema, rows]) => (
                <>
                  <tr key={`sub-${subsistema}`} className="bg-gray-50">
                    <td colSpan={3 + columns.length} className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{subsistema}</td>
                  </tr>
                  {rows.map(({ item, slots }) => {
                    const periodicidadeEnum = itemPeriodicidadeEnum(item);
                    const cor = PERIODICIDADE_COR[periodicidadeEnum];
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/60 transition-colors group border-b border-gray-50">
                        <td className="px-2 py-2 bg-white group-hover:bg-gray-50/60"
                          style={{ position: "sticky", left: 0, zIndex: 10, width: COL_ID }}>
                          <span className="text-[10px] font-mono font-semibold text-gray-400 block truncate">{item.id}</span>
                        </td>
                        <td className="px-3 py-2 bg-white group-hover:bg-gray-50/60"
                          style={{ position: "sticky", left: COL_ID, zIndex: 10, width: COL_DESC }}>
                          <p className="text-xs text-gray-700 leading-snug line-clamp-2">{item.descricao}</p>
                        </td>
                        <td className="px-3 py-2" style={{ width: COL_PERIOD }}>
                          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap inline-block", cor?.bg ?? "bg-gray-100", cor?.text ?? "text-gray-600")}>
                            {item.periodicidade}
                          </span>
                        </td>
                        {slots.map((slot) => {
                          const classif = classifySlotItem(slot);
                          const periods = slot.os ? getPeriodicidadesOS(slot.os) : [];
                          const isMulti = periods.length > 1;
                          return (
                            <td key={slot.col.key}
                              className={cn("text-center py-1.5 px-0.5", slot.col.isCurrent && "bg-violet-50/30")}
                              style={{ width: COL_SLOT }}>
                              {classif === "nao_esperado" && (
                                <div className="flex items-center justify-center"><span className="text-gray-200 text-xs">–</span></div>
                              )}
                              {slot.os && classif !== "nao_esperado" && (
                                <Link href={`/ordens/${slot.os.id}`} title={`${slot.os.numero} — ${slot.os.titulo}`}
                                  className={cn("mx-auto w-8 h-6 rounded flex items-center justify-center",
                                    "hover:scale-110 hover:shadow-md transition-all cursor-pointer shadow-sm text-white text-[9px] font-bold relative",
                                    classif === "concluida" ? "bg-green-500"
                                      : classif === "atrasada" ? "bg-red-400"
                                      : classif === "atual" ? (STATUS_COR[slot.os.status]?.bg ?? "bg-violet-500")
                                      : "bg-gray-300")}>
                                  {slot.os.status === "CONCLUIDA" ? <CheckCircle2 className="w-3 h-3" /> : slot.os.numero.slice(-3)}
                                  {isMulti && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-violet-600 rounded-full flex items-center justify-center text-[7px] text-white font-bold">
                                      {periods.length}
                                    </span>
                                  )}
                                </Link>
                              )}
                              {!slot.os && classif !== "nao_esperado" && (
                                <button
                                  onClick={() => setModalState({ periodicidades: periodicidadesEsperadasNoMes(slot.col.dueAnchor), mes: slot.col.dueAnchor })}
                                  title={`Criar OS — ${format(slot.col.dueAnchor, "MMM/yy", { locale: ptBR })}`}
                                  className="mx-auto w-8 h-6 rounded border-2 border-dashed border-gray-300 hover:border-violet-400 hover:bg-violet-50 flex items-center justify-center transition-all group">
                                  <Plus className="w-3 h-3 text-gray-300 group-hover:text-violet-500 transition-colors" />
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}