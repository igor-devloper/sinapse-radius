"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback, useState } from "react";

export function OSFiltros() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const atualizar = useCallback((key: string, value: string) => {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    sp.delete("page");
    router.push(`/ordens?${sp.toString()}`);
  }, [params, router]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar OS, número, local..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && atualizar("q", q)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
        />
      </div>
      <select
        defaultValue={params.get("status") ?? ""}
        onChange={(e) => atualizar("status", e.target.value)}
        className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
      >
        <option value="">Todos os status</option>
        <option value="ABERTA">Aberta</option>
        <option value="EM_ANDAMENTO">Em andamento</option>
        <option value="AGUARDANDO_PECA">Aguardando peça</option>
        <option value="PAUSADA">Pausada</option>
        <option value="CONCLUIDA">Concluída</option>
        <option value="CANCELADA">Cancelada</option>
      </select>
      <select
        defaultValue={params.get("prioridade") ?? ""}
        onChange={(e) => atualizar("prioridade", e.target.value)}
        className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
      >
        <option value="">Todas as prioridades</option>
        <option value="CRITICA">Crítica</option>
        <option value="ALTA">Alta</option>
        <option value="MEDIA">Média</option>
        <option value="BAIXA">Baixa</option>
      </select>
      <select
        defaultValue={params.get("tipo") ?? ""}
        onChange={(e) => atualizar("tipo", e.target.value)}
        className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
      >
        <option value="">Todos os tipos</option>
        <option value="CORRETIVA">Corretiva</option>
        <option value="PREVENTIVA">Preventiva</option>
        <option value="PREDITIVA">Preditiva</option>
        <option value="EMERGENCIAL">Emergencial</option>
      </select>
    </div>
  );
}
