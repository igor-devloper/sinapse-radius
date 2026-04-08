"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Save } from "lucide-react";
import { toast } from "sonner";

export function ConclusaoRelatorio({
  osId,
  initialTexto,
  canEdit,
}: {
  osId: string;
  initialTexto: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(initialTexto);
  const [saving, setSaving] = useState(false);

  async function salvar() {
    setSaving(true);
    try {
      const res = await fetch(`/api/os/${osId}/conclusao`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Não foi possível salvar a conclusão.");
        return;
      }

      toast.success("Conclusão do relatório salva.");
      router.refresh();
    } catch {
      toast.error("Erro ao salvar conclusão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <FileText className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-700">Conclusão do Relatório</h3>
      </div>
      <div className="p-5 space-y-3">
        <p className="text-xs text-gray-500">
          Registre particularidades técnicas, recomendações finais e observações críticas para compor o relatório PDF.
        </p>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          readOnly={!canEdit}
          rows={6}
          placeholder="Ex.: Durante a visita foi identificado desvio térmico no conjunto X, mitigado com ajuste de aperto e monitoramento recomendado por 7 dias..."
          className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm leading-relaxed placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 read-only:bg-gray-50 read-only:text-gray-600"
        />
        {canEdit && (
          <button
            type="button"
            onClick={salvar}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar conclusão"}
          </button>
        )}
      </div>
    </div>
  );
}

