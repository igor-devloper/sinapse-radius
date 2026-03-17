"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

export function FiltrosOS() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      params.delete("page");
      return params.toString();
    },
    [searchParams]
  );

  const set = (key: string, value: string | null) => {
    router.push(`${pathname}?${createQueryString({ [key]: value })}`);
  };

  const limpar = () => router.push(pathname);

  const hasFilters =
    searchParams.has("status") ||
    searchParams.has("prioridade") ||
    searchParams.has("tipo") ||
    searchParams.has("q");

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Busca */}
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar por título, número, local..."
          className="pl-9 h-9 border-gray-200 text-sm"
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val.length === 0 || val.length >= 3) set("q", val || null);
          }}
        />
      </div>

      {/* Status */}
      <Select
        value={searchParams.get("status") ?? "todos"}
        onValueChange={(v) => set("status", v === "todos" ? null : v)}
      >
        <SelectTrigger className="w-44 h-9 border-gray-200 text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os status</SelectItem>
          <SelectItem value="ABERTA">Aberta</SelectItem>
          <SelectItem value="EM_ANDAMENTO">Em andamento</SelectItem>
          <SelectItem value="AGUARDANDO_PECA">Aguardando peça</SelectItem>
          <SelectItem value="PAUSADA">Pausada</SelectItem>
          <SelectItem value="CONCLUIDA">Concluída</SelectItem>
          <SelectItem value="CANCELADA">Cancelada</SelectItem>
        </SelectContent>
      </Select>

      {/* Prioridade */}
      <Select
        value={searchParams.get("prioridade") ?? "todas"}
        onValueChange={(v) => set("prioridade", v === "todas" ? null : v)}
      >
        <SelectTrigger className="w-40 h-9 border-gray-200 text-sm">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas</SelectItem>
          <SelectItem value="CRITICA">Crítica</SelectItem>
          <SelectItem value="ALTA">Alta</SelectItem>
          <SelectItem value="MEDIA">Média</SelectItem>
          <SelectItem value="BAIXA">Baixa</SelectItem>
        </SelectContent>
      </Select>

      {/* Tipo de manutenção */}
      <Select
        value={searchParams.get("tipo") ?? "todos"}
        onValueChange={(v) => set("tipo", v === "todos" ? null : v)}
      >
        <SelectTrigger className="w-44 h-9 border-gray-200 text-sm">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os tipos</SelectItem>
          <SelectItem value="CORRETIVA">Corretiva</SelectItem>
          <SelectItem value="PREVENTIVA">Preventiva</SelectItem>
          <SelectItem value="PREDITIVA">Preditiva</SelectItem>
          <SelectItem value="EMERGENCIAL">Emergencial</SelectItem>
        </SelectContent>
      </Select>

      {/* Limpar filtros */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={limpar}
          className="h-9 text-gray-500 hover:text-gray-700 gap-1.5"
        >
          <X className="w-3.5 h-3.5" />
          Limpar
        </Button>
      )}
    </div>
  );
}
