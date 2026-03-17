"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { calcularSLA } from "@/lib/sla";
import { AlertCircle } from "lucide-react";

interface Tecnico {
  id: string;
  nome: string;
  cargo: string;
}

export function NovaOSForm({ tecnicos, usuarioId }: { tecnicos: Tecnico[]; usuarioId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dataEmissaoAxia, setDataEmissaoAxia] = useState("");

  const slaPreview = dataEmissaoAxia ? calcularSLA(new Date(dataEmissaoAxia)) : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const payload = {
      titulo: form.get("titulo"),
      descricao: form.get("descricao"),
      motivoOS: form.get("motivoOS"),
      tipoManutencao: form.get("tipoManutencao"),
      prioridade: form.get("prioridade"),
      dataEmissaoAxia: form.get("dataEmissaoAxia"),
      dataProgramada: form.get("dataProgramada") || undefined,
      localAtivo: form.get("localAtivo"),
      tag: form.get("tag") || undefined,
      responsavelId: form.get("responsavelId") || undefined,
    };

    try {
      const res = await fetch("/api/os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.formErrors?.[0] ?? "Erro ao criar OS");
      router.push(`/ordens/${data.os.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <Field label="Título da OS" required>
        <input name="titulo" required className={inputClass} placeholder="Ex: Troca de rolamento — Bomba 3" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo de manutenção" required>
          <select name="tipoManutencao" required className={inputClass}>
            <option value="CORRETIVA">Corretiva</option>
            <option value="PREVENTIVA">Preventiva</option>
            <option value="PREDITIVA">Preditiva</option>
            <option value="EMERGENCIAL">Emergencial</option>
          </select>
        </Field>
        <Field label="Prioridade" required>
          <select name="prioridade" defaultValue="MEDIA" className={inputClass}>
            <option value="CRITICA">Crítica</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>
        </Field>
      </div>

      <Field label="Local / Ativo" required>
        <input name="localAtivo" required className={inputClass} placeholder="Ex: Bomba #3 — Setor A" />
      </Field>

      <Field label="TAG do equipamento">
        <input name="tag" className={inputClass} placeholder="Ex: BBA-003" />
      </Field>

      <Field label="Descrição" required>
        <textarea name="descricao" required rows={3} className={inputClass} placeholder="Descreva o serviço a ser executado..." />
      </Field>

      <Field label="Motivo / Causa raiz" required>
        <textarea name="motivoOS" required rows={3} className={inputClass} placeholder="Descreva o motivo ou causa raiz da OS..." />
      </Field>

      {/* Data emissão Axia — campo principal do SLA */}
      <div className="rounded-xl bg-violet-50 p-4 space-y-3 border border-violet-100">
        <p className="text-sm font-medium text-violet-800">SLA contratual — OS Axia</p>
        <Field label="Data e hora de emissão da OS pela Axia (CONTRATANTE)" required>
          <input
            name="dataEmissaoAxia"
            type="datetime-local"
            required
            className={inputClass}
            value={dataEmissaoAxia}
            onChange={(e) => setDataEmissaoAxia(e.target.value)}
          />
        </Field>
        {slaPreview && (
          <div className="text-sm text-violet-700 bg-white/70 rounded-lg px-3 py-2">
            <p>Prazo limite: <strong>{slaPreview.dataLimite.toLocaleDateString("pt-BR")}</strong></p>
            <p className="text-xs text-violet-500 mt-0.5">24 meses a partir da emissão — contrato Axia</p>
          </div>
        )}
      </div>

      <Field label="Data programada para execução">
        <input name="dataProgramada" type="datetime-local" className={inputClass} />
      </Field>

      <Field label="Responsável técnico">
        <select name="responsavelId" className={inputClass}>
          <option value="">Selecionar responsável</option>
          {tecnicos.map((t) => (
            <option key={t.id} value={t.id}>{t.nome} ({t.cargo.toLowerCase()})</option>
          ))}
        </select>
      </Field>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 py-2.5 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 text-sm bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {loading ? "Criando..." : "Abrir OS"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-600">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}
