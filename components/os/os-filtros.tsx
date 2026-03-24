"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function OSFiltros() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const atualizar = useCallback((key: string, value: string) => {
    const sp = new URLSearchParams(params.toString());
    if (value && value !== "TODOS") sp.set(key, value);
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

      <Select
        defaultValue={params.get("status") ?? "TODOS"}
        onValueChange={(v) => atualizar("status", v)}
      >
        <SelectTrigger className="w-[180px] rounded-xl border-gray-200 text-sm">
          <SelectValue placeholder="Todos os status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODOS">Todos os status</SelectItem>
          <SelectItem value="ABERTA">Aberta</SelectItem>
          <SelectItem value="EM_ANDAMENTO">Em andamento</SelectItem>
          <SelectItem value="AGUARDANDO_PECA">Aguardando peça</SelectItem>
          <SelectItem value="PAUSADA">Pausada</SelectItem>
          <SelectItem value="CONCLUIDA">Concluída</SelectItem>
          <SelectItem value="CANCELADA">Cancelada</SelectItem>
        </SelectContent>
      </Select>

      <Select
        defaultValue={params.get("prioridade") ?? "TODOS"}
        onValueChange={(v) => atualizar("prioridade", v)}
      >
        <SelectTrigger className="w-[180px] rounded-xl border-gray-200 text-sm">
          <SelectValue placeholder="Todas as prioridades" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODOS">Todas as prioridades</SelectItem>
          <SelectItem value="CRITICA">Crítica</SelectItem>
          <SelectItem value="ALTA">Alta</SelectItem>
          <SelectItem value="MEDIA">Média</SelectItem>
          <SelectItem value="BAIXA">Baixa</SelectItem>
        </SelectContent>
      </Select>

      {/* ✅ Filtro por tipoOS — apenas CORRETIVA e PREVENTIVA conforme schema */}
      <Select
        defaultValue={params.get("tipoOS") ?? "TODOS"}
        onValueChange={(v) => atualizar("tipoOS", v)}
      >
        <SelectTrigger className="w-[180px] rounded-xl border-gray-200 text-sm">
          <SelectValue placeholder="Todos os tipos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODOS">Todos os tipos</SelectItem>
          <SelectItem value="CORRETIVA">Corretiva</SelectItem>
          <SelectItem value="PREVENTIVA">Preventiva</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}