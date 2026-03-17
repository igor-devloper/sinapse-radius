"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

export function NovaOSButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    titulo: "", descricao: "", motivoOS: "",
    tipoManutencao: "PREVENTIVA", prioridade: "MEDIA",
    dataEmissaoAxia: "", dataProgramada: "",
    localAtivo: "", tag: "",
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/os", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        dataEmissaoAxia: new Date(form.dataEmissaoAxia).toISOString(),
        dataProgramada: form.dataProgramada ? new Date(form.dataProgramada).toISOString() : undefined,
      }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setOpen(false);
      router.push(`/ordens/${data.os.id}`);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors"
      >
        <Plus className="w-4 h-4" /> Nova OS
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Abrir Nova OS</h2>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Título da OS *</label>
                  <input required value={form.titulo} onChange={(e) => set("titulo", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                    placeholder="Ex: Manutenção preventiva bomba centrífuga #3"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Tipo de Manutenção *</label>
                  <select value={form.tipoManutencao} onChange={(e) => set("tipoManutencao", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                  >
                    <option value="PREVENTIVA">Preventiva</option>
                    <option value="CORRETIVA">Corretiva</option>
                    <option value="PREDITIVA">Preditiva</option>
                    <option value="EMERGENCIAL">Emergencial</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Prioridade *</label>
                  <select value={form.prioridade} onChange={(e) => set("prioridade", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                    <option value="CRITICA">Crítica</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">
                    Data e hora de emissão da OS pela Axia *
                    <span className="text-violet-500 ml-1">(define o prazo SLA)</span>
                  </label>
                  <input required type="datetime-local" value={form.dataEmissaoAxia} onChange={(e) => set("dataEmissaoAxia", e.target.value)}
                    className="w-full border border-violet-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-violet-50/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Data programada</label>
                  <input type="datetime-local" value={form.dataProgramada} onChange={(e) => set("dataProgramada", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">TAG do equipamento</label>
                  <input value={form.tag} onChange={(e) => set("tag", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                    placeholder="Ex: BBA-003"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Local / Ativo *</label>
                  <input required value={form.localAtivo} onChange={(e) => set("localAtivo", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                    placeholder="Ex: Bomba centrífuga #3 — Setor A / Mineroduto"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Descrição *</label>
                  <textarea required rows={3} value={form.descricao} onChange={(e) => set("descricao", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                    placeholder="Descreva o escopo do serviço..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Motivo / Causa raiz *</label>
                  <textarea required rows={2} value={form.motivoOS} onChange={(e) => set("motivoOS", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                    placeholder="Causa identificada ou motivo da solicitação..."
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 text-sm text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {loading ? "Abrindo OS..." : "Abrir OS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
