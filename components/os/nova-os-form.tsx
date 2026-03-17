"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  calcularSLA, prazoFormatado, ATIVIDADE_LABEL,
  ATIVIDADES_PREVENTIVAS, ATIVIDADES_CORRETIVAS,
  SUBSISTEMAS, PRAZO_HORAS, ATIVIDADE_REFERENCIA_MANUAL,
  formatarDataBR, PRAZO_SLA,
} from "@/lib/sla-manual";
import { addHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle, BookOpen, Clock, Upload, X, FileText,
  Image as ImageIcon, File, CalendarIcon, User, Zap, CheckCircle2,
} from "lucide-react";
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Tecnico {
  id: string;
  nome: string;
  cargo: string;
  avatarUrl?: string | null;
}

interface AnexoLocal {
  uid: string;
  file: File;
}

// ── DateTimePicker ────────────────────────────────────────────────────────────
function DateTimePicker({
  value, onChange, placeholder = "Selecionar data", required,
}: {
  value: string; onChange: (iso: string) => void; placeholder?: string; required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value) : undefined;
  const timeStr = date
    ? `${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`
    : "";

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
          <Button type="button" variant="outline"
            className={cn("flex-1 justify-start font-normal rounded-xl border-gray-200 bg-white text-sm hover:bg-gray-50", !date && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4 text-gray-400 shrink-0" />
            {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} onSelect={handleDay} locale={ptBR} initialFocus />
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

// ── Helpers ───────────────────────────────────────────────────────────────────
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
function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
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

// ── Main ──────────────────────────────────────────────────────────────────────
export function NovaOSForm({ tecnicos }: { tecnicos: Tecnico[]; usuarioId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    titulo: "", descricao: "", motivoOS: "",
    tipoAtividade: "", prioridade: "MEDIA",
    dataEmissaoAxia: "", dataProgramada: "",
    subsistema: "", componenteTag: "", containerId: "",
    responsavelId: "",
  });
  const [anexos, setAnexos] = useState<AnexoLocal[]>([]);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  const prazoConfig = form.tipoAtividade ? PRAZO_SLA[form.tipoAtividade] : null;
  const prazoHoras = prazoConfig?.resolucaoHoras ?? null;
  const atuacaoHoras = prazoConfig?.atuacaoHoras ?? null;
  const dataLimitePreview = form.dataEmissaoAxia && prazoHoras
    ? addHours(new Date(form.dataEmissaoAxia), prazoHoras) : null;
  const dataAtuacaoPreview = form.dataEmissaoAxia && atuacaoHoras
    ? addHours(new Date(form.dataEmissaoAxia), atuacaoHoras) : null;
  const isCorretiva = ATIVIDADES_CORRETIVAS.includes(form.tipoAtividade);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).map((file) => ({ uid: crypto.randomUUID(), file }));
    setAnexos((prev) => [...prev, ...arr]);
  }
  function removeAnexo(uid: string) { setAnexos((prev) => prev.filter((a) => a.uid !== uid)); }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dataEmissaoAxia: new Date(form.dataEmissaoAxia).toISOString(),
          dataProgramada: form.dataProgramada ? new Date(form.dataProgramada).toISOString() : undefined,
          componenteTag: form.componenteTag || undefined,
          containerId: form.containerId || undefined,
          responsavelId: form.responsavelId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.formErrors?.[0] ?? "Erro ao criar OS");

      // Upload dos anexos
      if (anexos.length > 0) {
        await Promise.all(
          anexos.map(({ file }) => {
            const fd = new FormData(); fd.append("file", file);
            return fetch(`/api/os/${data.os.id}/anexos`, { method: "POST", body: fd });
          })
        );
      }

      router.push(`/ordens/${data.os.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── Identificação ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <SectionDivider>Identificação</SectionDivider>

        <Field label="Título da OS" required>
          <Input required value={form.titulo} onChange={(e) => set("titulo", e.target.value)}
            className="rounded-xl border-gray-200 focus-visible:ring-purple-300"
            placeholder="Ex: Lubrificação rolamentos bomba P01" />
        </Field>

        <Field label="Tipo de atividade" hint="Define o prazo SLA" required>
          <Select required value={form.tipoAtividade} onValueChange={(v) => set("tipoAtividade", v)}>
            <SelectTrigger className="rounded-xl border-gray-200 bg-white">
              <SelectValue placeholder="Selecionar atividade..." />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectGroup>
                <SelectLabel className="text-xs text-gray-400 font-semibold">Preventiva / Programada</SelectLabel>
                {ATIVIDADES_PREVENTIVAS.map((a) => (
                  <SelectItem key={a} value={a}>
                    <span>{ATIVIDADE_LABEL[a]}</span>
                    <span className="text-gray-400 text-xs ml-1">({prazoFormatado(PRAZO_HORAS[a])})</span>
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="text-xs text-gray-400 font-semibold">Corretiva / Emergencial</SelectLabel>
                {ATIVIDADES_CORRETIVAS.map((a) => (
                  <SelectItem key={a} value={a}>
                    <span>{ATIVIDADE_LABEL[a]}</span>
                    <span className="text-gray-400 text-xs ml-1">({prazoFormatado(PRAZO_HORAS[a])})</span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {form.tipoAtividade && (
            <div className="flex items-center gap-1.5 text-xs bg-purple-50 text-purple-700 rounded-lg px-3 py-1.5 mt-1 border border-purple-100">
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              {ATIVIDADE_REFERENCIA_MANUAL[form.tipoAtividade]}
              {prazoHoras && <span className="ml-auto font-semibold">{prazoFormatado(prazoHoras)}</span>}
            </div>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Prioridade" required>
            <Select value={form.prioridade} onValueChange={(v) => set("prioridade", v)}>
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
            <Input value={form.containerId} onChange={(e) => set("containerId", e.target.value)}
              className="rounded-xl border-gray-200 focus-visible:ring-purple-300" placeholder="HK3-01" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Subsistema" required>
            <Select required value={form.subsistema} onValueChange={(v) => set("subsistema", v)}>
              <SelectTrigger className="rounded-xl border-gray-200 bg-white">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                {SUBSISTEMAS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="TAG do componente">
            <Input value={form.componenteTag} onChange={(e) => set("componenteTag", e.target.value)}
              className="rounded-xl border-gray-200 focus-visible:ring-purple-300" placeholder="P01, G04, V202" />
          </Field>
        </div>
      </div>

      {/* ── SLA ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border p-6 space-y-4" style={{ background: "linear-gradient(135deg,#f5f3ff 0%,#fdf4ff 100%)", borderColor: "#e9d5ff" }}>
        <SectionDivider>SLA Contratual</SectionDivider>

        <Field label="Data e hora de emissão da OS — Axia (CONTRATANTE)" required>
          <DateTimePicker value={form.dataEmissaoAxia} onChange={(iso) => set("dataEmissaoAxia", iso)}
            placeholder="Selecionar data e hora" required />
        </Field>

        {dataLimitePreview && (
          <div className="grid gap-2">
            <div className="flex items-center justify-between bg-white/80 rounded-xl px-4 py-2.5 border border-purple-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-gray-500">Prazo de resolução</span>
              </div>
              <span className="text-sm font-bold text-purple-800">
                {format(dataLimitePreview, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
            {dataAtuacaoPreview && (
              <div className="flex items-center justify-between bg-orange-50 rounded-xl px-4 py-2.5 border border-orange-100">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <span className="text-xs text-gray-500">Prazo de atuação</span>
                </div>
                <span className="text-sm font-bold text-orange-700">
                  {format(dataAtuacaoPreview, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}
          </div>
        )}

        <Field label="Data programada para execução">
          <DateTimePicker value={form.dataProgramada} onChange={(iso) => set("dataProgramada", iso)} placeholder="Opcional" />
        </Field>
      </div>

      {/* ── Responsável ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <SectionDivider>Responsável</SectionDivider>

        <Field label="Técnico responsável">
          <Select value={form.responsavelId} onValueChange={(v) => set("responsavelId", v)}>
            <SelectTrigger className="rounded-xl border-gray-200 bg-white">
              <SelectValue placeholder="Selecionar responsável..." />
            </SelectTrigger>
            <SelectContent>
              {tecnicos.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: "#8B1FA9" }}>
                      {t.nome.charAt(0).toUpperCase()}
                    </div>
                    <span>{t.nome}</span>
                    <span className="text-xs text-gray-400 capitalize">({t.cargo.toLowerCase()})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.responsavelId && tecnicos.find((t) => t.id === form.responsavelId) && (
            <div className="flex items-center gap-3 bg-purple-50 rounded-xl px-3 py-2.5 mt-1 border border-purple-100">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ background: "#8B1FA9" }}>
                {tecnicos.find((t) => t.id === form.responsavelId)!.nome.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{tecnicos.find((t) => t.id === form.responsavelId)!.nome}</p>
                <p className="text-xs text-purple-600 capitalize">{tecnicos.find((t) => t.id === form.responsavelId)!.cargo.toLowerCase()}</p>
              </div>
              <button type="button" onClick={() => set("responsavelId", "")} className="ml-auto p-1 hover:bg-purple-100 rounded-lg transition-colors">
                <X className="w-3.5 h-3.5 text-purple-400" />
              </button>
            </div>
          )}
        </Field>
      </div>

      {/* ── Descrição ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <SectionDivider>Detalhes</SectionDivider>
        <Field label="Descrição da atividade" required>
          <Textarea required rows={3} value={form.descricao} onChange={(e) => set("descricao", e.target.value)}
            className="rounded-xl border-gray-200 focus-visible:ring-purple-300 resize-none"
            placeholder="Descreva o escopo do serviço conforme manual ANTSPACE HK3 V6..." />
        </Field>
        <Field label="Motivo / Sintoma observado" required>
          <Textarea required rows={3} value={form.motivoOS} onChange={(e) => set("motivoOS", e.target.value)}
            className="rounded-xl border-gray-200 focus-visible:ring-purple-300 resize-none"
            placeholder="Ex: Alarme ativo PT02 abaixo de 0,05 MPa. Nível do tanque em 40%..." />
        </Field>
      </div>

      {/* ── Anexos ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <SectionDivider>Anexos</SectionDivider>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-2xl px-6 py-8 flex flex-col items-center gap-3 cursor-pointer transition-all",
            dragOver ? "border-purple-400 bg-purple-50" : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
          )}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#F3E8FF" }}>
            <Upload className="w-5 h-5" style={{ color: "#8B1FA9" }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Arraste arquivos ou clique para selecionar</p>
            <p className="text-xs text-gray-400 mt-0.5">PDF, imagens, documentos — máx 10 MB por arquivo</p>
          </div>
          <input ref={fileInputRef} type="file" multiple className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            onChange={(e) => addFiles(e.target.files)} />
        </div>

        {/* Lista de arquivos */}
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
                <button type="button" onClick={() => removeAnexo(uid)}
                  className="p-1 hover:bg-gray-200 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                  <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Ações ────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()}
          className="flex-1 py-3 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium">
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-3 text-sm text-white font-semibold rounded-xl disabled:opacity-50 transition-all"
          style={{ background: loading ? "#9ca3af" : "linear-gradient(135deg,#1E1B4B 0%,#8B1FA9 100%)" }}>
          {loading ? "Abrindo OS..." : "Abrir Ordem de Serviço"}
        </button>
      </div>
    </form>
  );
}