"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

const statusOptions = [
  { value: "ABERTA", label: "Aberta" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "AGUARDANDO_PECA", label: "Aguardando peça" },
  { value: "PAUSADA", label: "Pausada" },
  { value: "CONCLUIDA", label: "Concluída" },
  { value: "CANCELADA", label: "Cancelada" },
];

export function AtualizarStatusOS({ osId, statusAtual }: { osId: string; statusAtual: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function atualizar(novoStatus: string) {
    if (novoStatus === statusAtual) { setOpen(false); return; }
    setLoading(true);
    setOpen(false);
    await fetch(`/api/os/${osId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="inline-flex items-center gap-2 text-sm border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors shadow-sm"
      >
        {loading ? "Atualizando..." : "Alterar status"}
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-20 min-w-[180px]">
          {statusOptions.map((s) => (
            <button
              key={s.value}
              onClick={() => atualizar(s.value)}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${s.value === statusAtual ? "text-violet-700 font-medium" : "text-gray-700"}`}
            >
              {s.label}
              {s.value === statusAtual && " ✓"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
