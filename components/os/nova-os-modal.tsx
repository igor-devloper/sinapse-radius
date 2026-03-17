"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const TIPOS = ["CORRETIVA", "PREVENTIVA", "PREDITIVA", "EMERGENCIAL"] as const;
const PRIORIDADES = ["CRITICA", "ALTA", "MEDIA", "BAIXA"] as const;

export function NovaOSModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErro(null);

    const form = new FormData(e.currentTarget);
    const body = {
      titulo: form.get("titulo"),
      descricao: form.get("descricao"),
      motivoOS: form.get("motivoOS"),
      tipoManutencao: form.get("tipoManutencao"),
      prioridade: form.get("prioridade"),
      dataEmissaoAxia: new Date(form.get("dataEmissaoAxia") as string).toISOString(),
      dataProgramada: form.get("dataProgramada")
        ? new Date(form.get("dataProgramada") as string).toISOString()
        : undefined,
      localAtivo: form.get("localAtivo"),
      tag: form.get("tag") || undefined,
    };

    const res = await fetch("/api/os", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      setErro(data.error?.formErrors?.[0] ?? "Erro ao criar OS. Verifique os campos.");
      setLoading(false);
      return;
    }

    router.refresh();
    router.push(`/ordens/${data.os.id}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Nova Ordem de Serviço</h2>
            <p className="text-sm text-gray-500 mt-0.5">Preencha os dados da OS</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Título */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              name="titulo"
              required
              minLength={5}
              placeholder="Ex: Manutenção corretiva bomba centrífuga #3"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition"
            />
          </div>

          {/* Tipo + Prioridade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Tipo de manutenção <span className="text-red-500">*</span>
              </label>
              <select
                name="tipoManutencao"
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition"
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Prioridade <span className="text-red-500">*</span>
              </label>
              <select
                name="prioridade"
                required
                defaultValue="MEDIA"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition"
              >
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Data emissão Axia — campo crítico do SLA */}
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
            <label className="text-xs font-semibold text-violet-700 mb-1.5 block">
              📋 Data e hora de emissão da OS pela Axia (CONTRATANTE) <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-violet-500 mb-2">
              Este campo define o início do prazo contratual de 24 meses.
            </p>
            <input
              type="datetime-local"
              name="dataEmissaoAxia"
              required
              className="w-full px-3 py-2 text-sm border border-violet-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition"
            />
          </div>

          {/* Local / ativo + TAG */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Local / Ativo <span className="text-red-500">*</span>
              </label>
              <input
                name="localAtivo"
                required
                placeholder="Ex: Bomba #3 — Setor A"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">TAG do equipamento</label>
              <input
                name="tag"
                placeholder="Ex: BMB-003"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition"
              />
            </div>
          </div>

          {/* Data programada */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Data programada para execução
            </label>
            <input
              type="datetime-local"
              name="dataProgramada"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition"
            />
          </div>

          {/* Motivo */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Motivo / Causa raiz <span className="text-red-500">*</span>
            </label>
            <textarea
              name="motivoOS"
              required
              minLength={5}
              rows={2}
              placeholder="Descreva o motivo ou causa raiz que gerou esta OS..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Descrição detalhada <span className="text-red-500">*</span>
            </label>
            <textarea
              name="descricao"
              required
              minLength={10}
              rows={3}
              placeholder="Descreva o serviço a ser executado, escopo, materiais necessários..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition"
            />
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              {erro}
            </div>
          )}

          {/* Ações */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-60 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {loading ? "Criando..." : "Criar OS"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
