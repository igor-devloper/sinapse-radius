"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, AlertTriangle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

import { ATIVIDADE_LABEL } from "@/lib/sla-manual";

interface OSProgramada {
  id: string;
  numero: string;
  titulo: string;
  tipoAtividade: string;
  prioridade: string;
  status: string;
  dataProgramada: Date | null;
  subsistema: string;
  componenteTag?: string | null;
  containerId?: string | null;
  responsavel: { nome: string } | null;
}

interface OSVencendo {
  id: string;
  numero: string;
  titulo: string;
  dataLimiteSLA: Date;
  prioridade: string;
  tipoAtividade: string;
}

const tipoColor: Record<string, string> = {
  CORRETIVA: "bg-orange-100 text-orange-700 border-orange-200",
  PREVENTIVA: "bg-blue-100 text-blue-700 border-blue-200",
  PREDITIVA: "bg-teal-100 text-teal-700 border-teal-200",
  EMERGENCIAL: "bg-red-100 text-red-700 border-red-200",
};

export function CalendarioOS({
  mesAtual,
  osProgramadas,
  osVencendoNoMes,
}: {
  mesAtual: string;
  osProgramadas: OSProgramada[];
  osVencendoNoMes: OSVencendo[];
}) {
  const router = useRouter();
  const [ano, mes] = mesAtual.split("-").map(Number);
  const dataRef = new Date(ano, mes - 1, 1);

  const diasDoMes = eachDayOfInterval({ start: startOfMonth(dataRef), end: endOfMonth(dataRef) });
  const primeiroDiaSemana = getDay(startOfMonth(dataRef)); // 0=dom

  function navMes(delta: number) {
    const nova = new Date(ano, mes - 1 + delta, 1);
    router.push(`/calendario?mes=${format(nova, "yyyy-MM")}`);
  }

  // Agrupar eventos por dia ISO
  const eventosPorDia: Record<string, { programadas: OSProgramada[]; vencimentos: OSVencendo[] }> = {};

  for (const os of osProgramadas) {
    if (!os.dataProgramada) continue;
    const key = new Date(os.dataProgramada).toISOString().split("T")[0];
    if (!eventosPorDia[key]) eventosPorDia[key] = { programadas: [], vencimentos: [] };
    eventosPorDia[key].programadas.push(os);
  }

  for (const os of osVencendoNoMes) {
    const key = new Date(os.dataLimiteSLA).toISOString().split("T")[0];
    if (!eventosPorDia[key]) eventosPorDia[key] = { programadas: [], vencimentos: [] };
    eventosPorDia[key].vencimentos.push(os);
  }

  const semanas = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-4">
      {/* Legenda + Nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navMes(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <h2 className="text-base font-semibold text-gray-900 capitalize">
            {format(dataRef, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <button onClick={() => navMes(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-200 border border-blue-300" /> Manutenção programada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-200 border border-red-300" /> Vencimento SLA
          </span>
        </div>
      </div>

      {/* Grade do calendário */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Cabeçalho dos dias */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {semanas.map((s) => (
            <div key={s} className="py-2.5 text-center text-xs font-medium text-gray-400">{s}</div>
          ))}
        </div>
        {/* Dias */}
        <div className="grid grid-cols-7">
          {/* Células vazias antes do primeiro dia */}
          {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] border-r border-b border-gray-50 bg-gray-50/30" />
          ))}
          {diasDoMes.map((dia) => {
            const key = format(dia, "yyyy-MM-dd");
            const eventos = eventosPorDia[key];
            const hoje = isToday(dia);

            return (
              <div key={key} className={`min-h-[100px] border-r border-b border-gray-50 p-1.5 ${hoje ? "bg-violet-50/40" : ""}`}>
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${hoje ? "bg-violet-600 text-white" : "text-gray-600"}`}>
                  {format(dia, "d")}
                </div>
                <div className="space-y-0.5">
                  {eventos?.programadas.slice(0, 2).map((os) => (
                    <Link key={os.id} href={`/ordens/${os.id}`} className="block text-xs px-1.5 py-0.5 rounded border truncate bg-blue-100 text-blue-700 border-blue-200">
                      {os.titulo}
                    </Link>
                  ))}
                  {eventos?.vencimentos.slice(0, 1).map((os) => (
                    <Link key={`v-${os.id}`} href={`/ordens/${os.id}`} className="block text-xs px-1.5 py-0.5 rounded border truncate bg-red-100 text-red-700 border-red-200">
                      ⚠ SLA: {os.titulo}
                    </Link>
                  ))}
                  {eventos && (eventos.programadas.length + eventos.vencimentos.length) > 3 && (
                    <span className="text-xs text-gray-400 pl-1">
                      +{(eventos.programadas.length + eventos.vencimentos.length) - 3} mais
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista das OS do mês */}
      {osProgramadas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-700">OS programadas neste mês ({osProgramadas.length})</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {osProgramadas.map((os) => (
              <Link key={os.id} href={`/ordens/${os.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{os.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {os.subsistema}{os.componenteTag ? ` · ${os.componenteTag}` : ""}{os.responsavel && ` · ${os.responsavel.nome}`}
                  </p>
                </div>
                <div className="text-xs text-gray-500 shrink-0 ml-4">
                  {os.dataProgramada && new Date(os.dataProgramada).toLocaleDateString("pt-BR")}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* SLA vencendo */}
      {osVencendoNoMes.length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-medium text-red-700">SLA vencendo neste mês ({osVencendoNoMes.length})</h3>
          </div>
          <div className="space-y-2">
            {osVencendoNoMes.map((os) => (
              <Link key={os.id} href={`/ordens/${os.id}`} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 hover:bg-red-50 transition-colors">
                <span className="text-sm text-gray-800">{os.titulo}</span>
                <span className="text-xs text-red-600 font-medium shrink-0 ml-4">
                  {new Date(os.dataLimiteSLA).toLocaleDateString("pt-BR")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}